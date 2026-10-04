import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Phase 2 data layer (#103, #101, #25):
//   - `logs` collection: the shared event store written by admin server actions
//     and read by the activity-log and account-log screens.
//   - `library_cards` collection: cards issued automatically per verified user
//     (the number form matches `generateCardId` in utils/library-cards.ts), with
//     a backfill for users verified before the feature existed.
//   - reviews gain an `article` relationship (exactly-one target enforced in
//     the collection's beforeValidate hook), so book_id becomes nullable.
//   - `books.category` index for the analytics group-by queries.
// Hand-written instead of `payload migrate:create`: the generator prompts on
// pre-existing snapshot drift (the same MCP api-keys issue as
// 20260924_100000_add_admin_notification_preferences).
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // ---- logs ----
  await db.execute(sql`CREATE SEQUENCE IF NOT EXISTS "logs_id_seq";`)
  await db.execute(
    sql`CREATE TYPE "enum_logs_action" AS ENUM (
      'book_created','book_updated','book_deleted','book_imported',
      'article_created','article_updated','article_deleted',
      'activity_created','activity_updated','activity_deleted',
      'review_deleted','loan_approved','loan_refused','loan_picked_up','loan_returned',
      'extension_approved','extension_refused',
      'user_verified','user_rejected','user_role_changed','user_deleted','users_imported',
      'card_archived'
    );`,
  )
  await db.execute(sql`
    CREATE TABLE "logs" (
      "id" integer DEFAULT nextval('logs_id_seq') NOT NULL,
      "actor_id" integer,
      "action" "enum_logs_action" NOT NULL,
      "target_type" varchar,
      "target_id" varchar,
      "timestamp" timestamptz NOT NULL,
      "message" varchar NOT NULL,
      "metadata" jsonb,
      "updated_at" timestamptz DEFAULT now() NOT NULL,
      "created_at" timestamptz DEFAULT now() NOT NULL,
      PRIMARY KEY ("id")
    );
  `)
  await db.execute(sql`ALTER SEQUENCE "logs_id_seq" OWNED BY "logs"."id";`)
  await db.execute(sql`CREATE INDEX "logs_actor_idx" ON "logs" USING btree ("actor_id");`)
  await db.execute(sql`CREATE INDEX "logs_action_idx" ON "logs" USING btree ("action");`)
  await db.execute(sql`CREATE INDEX "logs_timestamp_idx" ON "logs" USING btree ("timestamp");`)
  await db.execute(sql`CREATE INDEX "logs_created_at_idx" ON "logs" USING btree ("created_at");`)
  await db.execute(sql`CREATE INDEX "logs_updated_at_idx" ON "logs" USING btree ("updated_at");`)
  await db.execute(sql`
    ALTER TABLE "logs" ADD CONSTRAINT "logs_actor_id_users_id_fk"
    FOREIGN KEY ("actor_id") REFERENCES "users" ("id") ON DELETE SET NULL;
  `)

  // ---- library_cards ----
  await db.execute(sql`CREATE SEQUENCE IF NOT EXISTS "library_cards_id_seq";`)
  await db.execute(sql`CREATE TYPE "enum_library_cards_status" AS ENUM ('active','archived');`)
  await db.execute(sql`
    CREATE TABLE "library_cards" (
      "id" integer DEFAULT nextval('library_cards_id_seq') NOT NULL,
      "card_id" varchar NOT NULL,
      "user_id" integer NOT NULL,
      "status" "enum_library_cards_status" DEFAULT 'active',
      "issue_date" timestamptz DEFAULT now() NOT NULL,
      "archived_at" timestamptz,
      "updated_at" timestamptz DEFAULT now() NOT NULL,
      "created_at" timestamptz DEFAULT now() NOT NULL,
      PRIMARY KEY ("id")
    );
  `)
  await db.execute(sql`ALTER SEQUENCE "library_cards_id_seq" OWNED BY "library_cards"."id";`)
  await db.execute(
    sql`CREATE UNIQUE INDEX "library_cards_card_id_idx" ON "library_cards" USING btree ("card_id");`,
  )
  await db.execute(
    sql`CREATE INDEX "library_cards_user_idx" ON "library_cards" USING btree ("user_id");`,
  )
  await db.execute(
    sql`CREATE INDEX "library_cards_status_idx" ON "library_cards" USING btree ("status");`,
  )
  await db.execute(
    sql`CREATE INDEX "library_cards_created_at_idx" ON "library_cards" USING btree ("created_at");`,
  )
  await db.execute(
    sql`CREATE INDEX "library_cards_updated_at_idx" ON "library_cards" USING btree ("updated_at");`,
  )
  await db.execute(sql`
    ALTER TABLE "library_cards" ADD CONSTRAINT "library_cards_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;
  `)

  // Backfill cards + the users.cardId pointer for everyone verified so far.
  await db.execute(sql`
    INSERT INTO "library_cards" ("card_id", "user_id", "status", "issue_date", "created_at", "updated_at")
    SELECT 'M-' || lpad(u."id"::text, 5, '0'), u."id", 'active', u."created_at", now(), now()
    FROM "users" u
    WHERE u."verification_status" = 'verified'
      AND NOT EXISTS (SELECT 1 FROM "library_cards" lc WHERE lc."user_id" = u."id");
  `)
  await db.execute(sql`
    UPDATE "users" u SET "card_id" = 'M-' || lpad(u."id"::text, 5, '0')
    WHERE u."verification_status" = 'verified' AND (u."card_id" IS NULL OR u."card_id" = '');
  `)

  // ---- reviews article relation (exactly-one target) ----
  await db.execute(sql`ALTER TABLE "reviews" ADD COLUMN "article_id" integer;`)
  await db.execute(sql`ALTER TABLE "reviews" ALTER COLUMN "book_id" DROP NOT NULL;`)
  await db.execute(sql`
    ALTER TABLE "reviews" ADD CONSTRAINT "reviews_article_id_articles_id_fk"
    FOREIGN KEY ("article_id") REFERENCES "articles" ("id") ON DELETE SET NULL;
  `)
  await db.execute(sql`CREATE INDEX "reviews_article_idx" ON "reviews" USING btree ("article_id");`)

  // ---- analytics index ----
  await db.execute(sql`CREATE INDEX "books_category_idx" ON "books" USING btree ("category");`)

  // ---- document-lock bookkeeping (every collection is a rels target) ----
  await db.execute(sql`ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "logs_id" integer;`)
  await db.execute(
    sql`ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_logs_fk" FOREIGN KEY ("logs_id") REFERENCES "public"."logs"("id") ON DELETE cascade ON UPDATE no action;`,
  )
  await db.execute(
    sql`CREATE INDEX "payload_locked_documents_rels_logs_id_idx" ON "payload_locked_documents_rels" USING btree ("logs_id");`,
  )
  await db.execute(
    sql`ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "library_cards_id" integer;`,
  )
  await db.execute(
    sql`ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_library_cards_fk" FOREIGN KEY ("library_cards_id") REFERENCES "public"."library_cards"("id") ON DELETE cascade ON UPDATE no action;`,
  )
  await db.execute(
    sql`CREATE INDEX "payload_locked_documents_rels_library_cards_id_idx" ON "payload_locked_documents_rels" USING btree ("library_cards_id");`,
  )
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(
    sql`ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_library_cards_fk";`,
  )
  await db.execute(sql`DROP INDEX IF EXISTS "payload_locked_documents_rels_library_cards_id_idx";`)
  await db.execute(
    sql`ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "library_cards_id";`,
  )
  await db.execute(
    sql`ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_logs_fk";`,
  )
  await db.execute(sql`DROP INDEX IF EXISTS "payload_locked_documents_rels_logs_id_idx";`)
  await db.execute(
    sql`ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "logs_id";`,
  )

  await db.execute(sql`DROP INDEX IF EXISTS "books_category_idx";`)
  await db.execute(sql`DROP INDEX IF EXISTS "reviews_article_idx";`)
  await db.execute(
    sql`ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "reviews_article_id_articles_id_fk";`,
  )
  await db.execute(sql`ALTER TABLE "reviews" ALTER COLUMN "book_id" SET NOT NULL;`)
  await db.execute(sql`ALTER TABLE "reviews" DROP COLUMN IF EXISTS "article_id";`)

  await db.execute(sql`DROP TABLE IF EXISTS "library_cards";`)
  await db.execute(sql`DROP SEQUENCE IF EXISTS "library_cards_id_seq";`)
  await db.execute(sql`DROP TYPE IF EXISTS "enum_library_cards_status";`)

  await db.execute(sql`DROP TABLE IF EXISTS "logs";`)
  await db.execute(sql`DROP SEQUENCE IF EXISTS "logs_id_seq";`)
  await db.execute(sql`DROP TYPE IF EXISTS "enum_logs_action";`)
}
