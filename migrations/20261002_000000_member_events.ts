import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// #178 — the member's own timeline becomes durable. Until now
// getActivityLog re-derived a member's history from the seven collections they
// own, so un-favoriting a book or withdrawing a registration erased the
// record that it ever happened, and an admin deleting a book took every loan
// event that named it along.
//
// `member_events` is the append-only companion to `logs`: one row per member
// action, written by afterChange hooks on the seven source collections, never
// updated or deleted (denied at the collection level, mirroring `logs`). The
// target is stored as plain text pointing at the *content* (book / activity /
// article), so titles stay resolvable after the source row is gone, and a
// deleted target simply renders without a detail line.
//
// Hand-written rather than generated: the generator still trips over the same
// pre-existing snapshot drift on the `notifications` table that
// 20260930_000000_loan_pickup_window and 20260930_040000_log_target_indexes
// record, and offers to rename an unrelated table into it.
//
// The backfill copies the history members have already accumulated, dated
// from each source row's `created_at`, so switching does not empty anyone's
// screen. On a fresh database the SELECTs find nothing and the migration is a
// plain table creation.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`CREATE SEQUENCE IF NOT EXISTS "member_events_id_seq";`)
  await db.execute(sql`
    CREATE TYPE "enum_member_events_action" AS ENUM (
      'loan_requested','extension_requested','waitlist_joined',
      'registration_created','book_favorited','article_favorited','review_created'
    );
  `)
  await db.execute(sql`
    CREATE TABLE "member_events" (
      "id" integer DEFAULT nextval('member_events_id_seq') NOT NULL,
      "user_id" integer NOT NULL,
      "action" "enum_member_events_action" NOT NULL,
      "target_type" varchar NOT NULL,
      "target_id" varchar NOT NULL,
      "timestamp" timestamptz NOT NULL,
      "updated_at" timestamptz DEFAULT now() NOT NULL,
      "created_at" timestamptz DEFAULT now() NOT NULL,
      PRIMARY KEY ("id")
    );
  `)
  await db.execute(sql`ALTER SEQUENCE "member_events_id_seq" OWNED BY "member_events"."id";`)
  await db.execute(
    sql`CREATE INDEX "member_events_user_idx" ON "member_events" USING btree ("user_id");`,
  )
  await db.execute(
    sql`CREATE INDEX "member_events_action_idx" ON "member_events" USING btree ("action");`,
  )
  await db.execute(
    sql`CREATE INDEX "member_events_target_type_idx" ON "member_events" USING btree ("target_type");`,
  )
  await db.execute(
    sql`CREATE INDEX "member_events_target_id_idx" ON "member_events" USING btree ("target_id");`,
  )
  await db.execute(
    sql`CREATE INDEX "member_events_timestamp_idx" ON "member_events" USING btree ("timestamp");`,
  )
  await db.execute(
    sql`CREATE INDEX "member_events_created_at_idx" ON "member_events" USING btree ("created_at");`,
  )
  await db.execute(
    sql`CREATE INDEX "member_events_updated_at_idx" ON "member_events" USING btree ("updated_at");`,
  )
  // The owner's account deletion is the one natural erasure: the member's own
  // history is theirs alone, and the account purge keeps its erasure promise.
  await db.execute(sql`
    ALTER TABLE "member_events" ADD CONSTRAINT "member_events_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE cascade ON UPDATE no action;
  `)
  // Same lock-tracking column every other collection's table gains.
  await db.execute(
    sql`ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "member_events_id" integer;`,
  )
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
    ADD CONSTRAINT "payload_locked_documents_rels_member_events_fk"
    FOREIGN KEY ("member_events_id") REFERENCES "public"."member_events"("id")
    ON DELETE cascade ON UPDATE no action;
  `)
  await db.execute(sql`
    CREATE INDEX "payload_locked_documents_rels_member_events_id_idx"
    ON "payload_locked_documents_rels" USING btree ("member_events_id");
  `)

  // ---- backfill: every member action already living in the source rows ----
  // Dated from each row's `created_at`, so the rebuilt timeline reads exactly
  // what the derived one used to show.
  await db.execute(sql`
    INSERT INTO "member_events" ("user_id","action","target_type","target_id","timestamp","updated_at","created_at")
    SELECT "user_id", 'loan_requested', 'book', "book_id"::varchar, "created_at", "created_at", "created_at"
    FROM "loans" WHERE "user_id" IS NOT NULL AND "book_id" IS NOT NULL;
  `)
  await db.execute(sql`
    INSERT INTO "member_events" ("user_id","action","target_type","target_id","timestamp","updated_at","created_at")
    SELECT le."user_id", 'extension_requested', 'book', l."book_id"::varchar,
           le."created_at", le."created_at", le."created_at"
    FROM "loan_extensions" le
    JOIN "loans" l ON l."id" = le."loan_id"
    WHERE le."user_id" IS NOT NULL AND l."book_id" IS NOT NULL;
  `)
  await db.execute(sql`
    INSERT INTO "member_events" ("user_id","action","target_type","target_id","timestamp","updated_at","created_at")
    SELECT "user_id", 'waitlist_joined', 'book', "book_id"::varchar, "created_at", "created_at", "created_at"
    FROM "waitlist_entries" WHERE "user_id" IS NOT NULL AND "book_id" IS NOT NULL;
  `)
  await db.execute(sql`
    INSERT INTO "member_events" ("user_id","action","target_type","target_id","timestamp","updated_at","created_at")
    SELECT "user_id", 'registration_created', 'activity', "activity_id"::varchar, "created_at", "created_at", "created_at"
    FROM "activity_registrations" WHERE "user_id" IS NOT NULL AND "activity_id" IS NOT NULL;
  `)
  await db.execute(sql`
    INSERT INTO "member_events" ("user_id","action","target_type","target_id","timestamp","updated_at","created_at")
    SELECT "user_id", 'book_favorited', 'book', "book_id"::varchar, "created_at", "created_at", "created_at"
    FROM "book_favorites" WHERE "user_id" IS NOT NULL AND "book_id" IS NOT NULL;
  `)
  await db.execute(sql`
    INSERT INTO "member_events" ("user_id","action","target_type","target_id","timestamp","updated_at","created_at")
    SELECT "user_id", 'article_favorited', 'article', "article_id"::varchar, "created_at", "created_at", "created_at"
    FROM "article_favorites" WHERE "user_id" IS NOT NULL AND "article_id" IS NOT NULL;
  `)
  // A review targets exactly one side of the pair.
  await db.execute(sql`
    INSERT INTO "member_events" ("user_id","action","target_type","target_id","timestamp","updated_at","created_at")
    SELECT "user_id", 'review_created', 'book', "book_id"::varchar, "created_at", "created_at", "created_at"
    FROM "reviews" WHERE "user_id" IS NOT NULL AND "book_id" IS NOT NULL;
  `)
  await db.execute(sql`
    INSERT INTO "member_events" ("user_id","action","target_type","target_id","timestamp","updated_at","created_at")
    SELECT "user_id", 'review_created', 'article', "article_id"::varchar, "created_at", "created_at", "created_at"
    FROM "reviews" WHERE "user_id" IS NOT NULL AND "article_id" IS NOT NULL;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Down is destructive by nature — it drops the table and every event the
  // hooks have written, the one operation this collection's access control
  // refuses. Dropping the enum type along with it, since nothing else uses it.
  await db.execute(
    sql`ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_member_events_fk";`,
  )
  await db.execute(sql`DROP INDEX IF EXISTS "payload_locked_documents_rels_member_events_id_idx";`)
  await db.execute(
    sql`ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "member_events_id";`,
  )
  await db.execute(sql`DROP TABLE IF EXISTS "member_events";`)
  await db.execute(sql`DROP SEQUENCE IF EXISTS "member_events_id_seq";`)
  await db.execute(sql`DROP TYPE IF EXISTS "enum_member_events_action";`)
}
