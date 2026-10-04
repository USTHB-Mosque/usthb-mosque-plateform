import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * #156 — admin user detail, reviews panel, loan settings and analytics.
 *
 * Independent of every other migration in the list: it creates its own sequence
 * and table, adds its own columns to `payload_locked_documents_rels`, its own
 * index and its own enum values, so the order it runs in relative to its
 * neighbours (including `20261002_000000_member_events`, which shares the date
 * prefix) cannot matter.
 *
 * Three additive changes, no existing table is altered in a lossy way:
 *
 * 1. `article_reads` — the counter table behind the admin "article reads"
 *    analytics (#156). There was no read counter anywhere in the schema, so the
 *    metric SPEC §7.8 asks for could not be computed from real rows at all.
 * 2. `loans_pickup_date_idx` — the pickup peak aggregations group
 *    `loans.pickup_date` by hour and weekday; without the index that is a
 *    sequential scan of the whole table.
 * 3. Two new `logs.action` enum values for the admin actions this issue adds
 *    (`review_copied`, `loan_settings_updated`), so both are auditable like
 *    every other admin write.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`CREATE SEQUENCE IF NOT EXISTS "article_reads_id_seq";`)
  await db.execute(sql`
    CREATE TABLE "article_reads" (
      "id" integer DEFAULT nextval('article_reads_id_seq') NOT NULL,
      "article_id" integer NOT NULL,
      "user_id" integer NOT NULL,
      "read_count" numeric DEFAULT 1 NOT NULL,
      "last_read_at" timestamptz DEFAULT now() NOT NULL,
      "updated_at" timestamptz DEFAULT now() NOT NULL,
      "created_at" timestamptz DEFAULT now() NOT NULL,
      PRIMARY KEY ("id")
    );
  `)
  await db.execute(sql`ALTER SEQUENCE "article_reads_id_seq" OWNED BY "article_reads"."id";`)
  await db.execute(
    sql`ALTER TABLE "article_reads" ADD CONSTRAINT "article_reads_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "articles" ("id") ON DELETE CASCADE;`,
  )
  await db.execute(
    sql`ALTER TABLE "article_reads" ADD CONSTRAINT "article_reads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;`,
  )
  await db.execute(sql`CREATE INDEX "article_reads_article_idx" ON "article_reads" ("article_id");`)
  await db.execute(sql`CREATE INDEX "article_reads_user_idx" ON "article_reads" ("user_id");`)
  // One counter row per (article, member): the read lookup is a point query on
  // this pair, and the uniqueness is what keeps it from drifting into two rows.
  await db.execute(
    sql`CREATE UNIQUE INDEX "article_reads_article_user_unique" ON "article_reads" ("article_id", "user_id");`,
  )
  await db.execute(
    sql`CREATE INDEX "article_reads_created_at_idx" ON "article_reads" ("created_at");`,
  )
  await db.execute(
    sql`CREATE INDEX "article_reads_updated_at_idx" ON "article_reads" ("updated_at");`,
  )

  await db.execute(
    sql`ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "article_reads_id" integer;`,
  )
  await db.execute(
    sql`ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_article_reads_fk" FOREIGN KEY ("article_reads_id") REFERENCES "article_reads" ("id") ON DELETE CASCADE;`,
  )
  await db.execute(
    sql`CREATE INDEX "payload_locked_documents_rels_article_reads_id_idx" ON "payload_locked_documents_rels" ("article_reads_id");`,
  )

  await db.execute(sql`CREATE INDEX "loans_pickup_date_idx" ON "loans" ("pickup_date");`)

  await db.execute(sql`ALTER TYPE "enum_logs_action" ADD VALUE 'review_copied';`)
  await db.execute(sql`ALTER TYPE "enum_logs_action" ADD VALUE 'loan_settings_updated';`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(
    sql`ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_article_reads_fk";`,
  )
  await db.execute(sql`DROP INDEX IF EXISTS "payload_locked_documents_rels_article_reads_id_idx";`)
  await db.execute(
    sql`ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "article_reads_id";`,
  )
  await db.execute(sql`DROP INDEX IF EXISTS "loans_pickup_date_idx";`)
  await db.execute(sql`DROP TABLE IF EXISTS "article_reads";`)
  await db.execute(sql`DROP SEQUENCE IF EXISTS "article_reads_id_seq";`)
  // Keep enum values: existing log rows may still reference them.
}
