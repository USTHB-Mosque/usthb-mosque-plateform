import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// #152: registering the Payload jobs queue in the config adds the
// payload_jobs / payload_jobs_log / payload_jobs_stats tables. The DDL below is
// exactly what `push` produces for this config, captured from a scratch
// database; it is written out rather than generated because the migration
// generator still trips over pre-existing snapshot drift on the notifications
// table (see 20260928_000000_book_requests).
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`CREATE SEQUENCE IF NOT EXISTS "payload_jobs_id_seq";`)
  await db.execute(sql`CREATE SEQUENCE IF NOT EXISTS "payload_jobs_stats_id_seq";`)

  await db.execute(sql`
    CREATE TYPE "enum_payload_jobs_task_slug" AS ENUM ('inline', 'purgeDeletedAccounts');
  `)
  await db.execute(sql`
    CREATE TYPE "enum_payload_jobs_log_task_slug" AS ENUM ('inline', 'purgeDeletedAccounts');
  `)
  await db.execute(sql`CREATE TYPE "enum_payload_jobs_log_state" AS ENUM ('failed', 'succeeded');`)

  await db.execute(sql`
    CREATE TABLE "payload_jobs" (
      "id" integer DEFAULT nextval('payload_jobs_id_seq') NOT NULL,
      "input" jsonb,
      "completed_at" timestamptz,
      "total_tried" numeric DEFAULT 0,
      "has_error" boolean DEFAULT false,
      "error" jsonb,
      "task_slug" "enum_payload_jobs_task_slug",
      "queue" varchar DEFAULT 'default',
      "wait_until" timestamptz,
      "processing" boolean DEFAULT false,
      "meta" jsonb,
      "updated_at" timestamptz DEFAULT now() NOT NULL,
      "created_at" timestamptz DEFAULT now() NOT NULL,
      PRIMARY KEY ("id")
    );
  `)
  await db.execute(sql`ALTER SEQUENCE "payload_jobs_id_seq" OWNED BY "payload_jobs"."id";`)

  await db.execute(sql`
    CREATE TABLE "payload_jobs_log" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar NOT NULL,
      "executed_at" timestamptz NOT NULL,
      "completed_at" timestamptz NOT NULL,
      "task_slug" "enum_payload_jobs_log_task_slug" NOT NULL,
      "task_i_d" varchar NOT NULL,
      "input" jsonb,
      "output" jsonb,
      "state" "enum_payload_jobs_log_state" NOT NULL,
      "error" jsonb,
      PRIMARY KEY ("id")
    );
  `)

  await db.execute(sql`
    CREATE TABLE "payload_jobs_stats" (
      "id" integer DEFAULT nextval('payload_jobs_stats_id_seq') NOT NULL,
      "stats" jsonb,
      "updated_at" timestamptz,
      "created_at" timestamptz,
      PRIMARY KEY ("id")
    );
  `)
  await db.execute(
    sql`ALTER SEQUENCE "payload_jobs_stats_id_seq" OWNED BY "payload_jobs_stats"."id";`,
  )

  await db.execute(
    sql`ALTER TABLE "payload_jobs_log" ADD CONSTRAINT "payload_jobs_log_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload_jobs" ("id") ON DELETE CASCADE;`,
  )

  await db.execute(
    sql`CREATE INDEX "payload_jobs_completed_at_idx" ON "payload_jobs" ("completed_at");`,
  )
  await db.execute(
    sql`CREATE INDEX "payload_jobs_created_at_idx" ON "payload_jobs" ("created_at");`,
  )
  await db.execute(sql`CREATE INDEX "payload_jobs_has_error_idx" ON "payload_jobs" ("has_error");`)
  await db.execute(
    sql`CREATE INDEX "payload_jobs_processing_idx" ON "payload_jobs" ("processing");`,
  )
  await db.execute(sql`CREATE INDEX "payload_jobs_queue_idx" ON "payload_jobs" ("queue");`)
  await db.execute(sql`CREATE INDEX "payload_jobs_task_slug_idx" ON "payload_jobs" ("task_slug");`)
  await db.execute(
    sql`CREATE INDEX "payload_jobs_total_tried_idx" ON "payload_jobs" ("total_tried");`,
  )
  await db.execute(
    sql`CREATE INDEX "payload_jobs_updated_at_idx" ON "payload_jobs" ("updated_at");`,
  )
  await db.execute(
    sql`CREATE INDEX "payload_jobs_wait_until_idx" ON "payload_jobs" ("wait_until");`,
  )
  await db.execute(sql`CREATE INDEX "payload_jobs_log_order_idx" ON "payload_jobs_log" ("_order");`)
  await db.execute(
    sql`CREATE INDEX "payload_jobs_log_parent_id_idx" ON "payload_jobs_log" ("_parent_id");`,
  )
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "payload_jobs_log";`)
  await db.execute(sql`DROP TABLE IF EXISTS "payload_jobs_stats";`)
  await db.execute(sql`DROP TABLE IF EXISTS "payload_jobs";`)
  await db.execute(sql`DROP SEQUENCE IF EXISTS "payload_jobs_id_seq";`)
  await db.execute(sql`DROP SEQUENCE IF EXISTS "payload_jobs_stats_id_seq";`)
  await db.execute(sql`DROP TYPE IF EXISTS "enum_payload_jobs_log_state";`)
  await db.execute(sql`DROP TYPE IF EXISTS "enum_payload_jobs_log_task_slug";`)
  await db.execute(sql`DROP TYPE IF EXISTS "enum_payload_jobs_task_slug";`)
}
