import { sql, type MigrateUpArgs, type MigrateDownArgs } from '@payloadcms/db-postgres'

// The generator prompts to rename the unrelated MCP table to notifications
// (stale snapshot drift). Only add the columns introduced by #154.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(
    sql`CREATE TYPE "enum_activity_registrations_status" AS ENUM ('pending', 'accepted', 'refused', 'quota_rejected');`,
  )
  await db.execute(
    sql`ALTER TABLE "activity_registrations" ADD COLUMN "status" "enum_activity_registrations_status" DEFAULT 'pending' NOT NULL;`,
  )
  // Rows that existed before #154 were plain "registered" members — they never
  // sat in an admin decision queue. Treat them as accepted so the fresh
  // deploy does not flood the new decision queue.
  await db.execute(sql`UPDATE "activity_registrations" SET "status" = 'accepted';`)
  await db.execute(sql`ALTER TABLE "activity_registrations" ADD COLUMN "refusal_reason" varchar;`)
  await db.execute(
    sql`CREATE INDEX "activity_registrations_status_idx" ON "activity_registrations" ("status");`,
  )
  await db.execute(
    sql`ALTER TABLE "users" ADD COLUMN "notification_preferences_bulk_email_digest" boolean DEFAULT false;`,
  )
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(
    sql`ALTER TABLE "users" DROP COLUMN "notification_preferences_bulk_email_digest";`,
  )
  await db.execute(sql`DROP INDEX "activity_registrations_status_idx";`)
  await db.execute(sql`ALTER TABLE "activity_registrations" DROP COLUMN "refusal_reason";`)
  await db.execute(sql`ALTER TABLE "activity_registrations" DROP COLUMN "status";`)
  await db.execute(sql`DROP TYPE "enum_activity_registrations_status";`)
}
