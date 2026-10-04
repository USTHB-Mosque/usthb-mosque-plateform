import { sql, type MigrateUpArgs, type MigrateDownArgs } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`CREATE TYPE "enum_activities_kind" AS ENUM ('event', 'ongoing');`)
  await db.execute(
    sql`ALTER TABLE "activities" ADD COLUMN "kind" "enum_activities_kind" DEFAULT 'event' NOT NULL;`,
  )
  await db.execute(sql`ALTER TABLE "activities" ADD COLUMN "end_date" timestamptz;`)
  await db.execute(sql`ALTER TYPE "enum_activity_registrations_status" ADD VALUE 'cancelled';`)
  await db.execute(sql`ALTER TYPE "enum_activity_registrations_status" ADD VALUE 'completed';`)
  await db.execute(sql`ALTER TYPE "enum_logs_action" ADD VALUE 'activity_attendance';`)
  await db.execute(
    sql`CREATE TYPE "enum_activity_feedback_sentiment" AS ENUM ('positive', 'negative');`,
  )
  await db.execute(sql`CREATE SEQUENCE IF NOT EXISTS "activity_feedback_id_seq";`)
  await db.execute(sql`
    CREATE TABLE "activity_feedback" (
      "id" integer DEFAULT nextval('activity_feedback_id_seq') NOT NULL,
      "activity_id" integer NOT NULL,
      "user_id" integer NOT NULL,
      "sentiment" "enum_activity_feedback_sentiment" NOT NULL,
      "comment" varchar,
      "updated_at" timestamptz DEFAULT now() NOT NULL,
      "created_at" timestamptz DEFAULT now() NOT NULL,
      PRIMARY KEY ("id")
    );
  `)
  await db.execute(
    sql`ALTER SEQUENCE "activity_feedback_id_seq" OWNED BY "activity_feedback"."id";`,
  )
  await db.execute(
    sql`ALTER TABLE "activity_feedback" ADD CONSTRAINT "activity_feedback_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "activities" ("id") ON DELETE CASCADE;`,
  )
  await db.execute(
    sql`ALTER TABLE "activity_feedback" ADD CONSTRAINT "activity_feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;`,
  )
  await db.execute(
    sql`CREATE UNIQUE INDEX "activity_feedback_activity_user_unique" ON "activity_feedback" ("activity_id", "user_id");`,
  )
  await db.execute(
    sql`CREATE INDEX "activity_feedback_activity_idx" ON "activity_feedback" ("activity_id");`,
  )
  await db.execute(
    sql`CREATE INDEX "activity_feedback_user_idx" ON "activity_feedback" ("user_id");`,
  )
  await db.execute(
    sql`CREATE INDEX "activity_feedback_created_at_idx" ON "activity_feedback" ("created_at");`,
  )
  await db.execute(
    sql`CREATE INDEX "activity_feedback_updated_at_idx" ON "activity_feedback" ("updated_at");`,
  )
  await db.execute(
    sql`ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "activity_feedback_id" integer;`,
  )
  await db.execute(
    sql`ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_activity_feedback_fk" FOREIGN KEY ("activity_feedback_id") REFERENCES "activity_feedback" ("id") ON DELETE CASCADE;`,
  )
  await db.execute(
    sql`CREATE INDEX "payload_locked_documents_rels_activity_feedback_id_idx" ON "payload_locked_documents_rels" ("activity_feedback_id");`,
  )
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(
    sql`ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_activity_feedback_fk";`,
  )
  await db.execute(
    sql`DROP INDEX IF EXISTS "payload_locked_documents_rels_activity_feedback_id_idx";`,
  )
  await db.execute(
    sql`ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "activity_feedback_id";`,
  )
  await db.execute(sql`DROP TABLE IF EXISTS "activity_feedback";`)
  await db.execute(sql`DROP SEQUENCE IF EXISTS "activity_feedback_id_seq";`)
  await db.execute(sql`DROP TYPE IF EXISTS "enum_activity_feedback_sentiment";`)
  await db.execute(sql`ALTER TABLE "activities" DROP COLUMN "end_date";`)
  await db.execute(sql`ALTER TABLE "activities" DROP COLUMN "kind";`)
  await db.execute(sql`DROP TYPE IF EXISTS "enum_activities_kind";`)
  // The three appended enum values are retained; old registrations and audit rows may refer to them.
}
