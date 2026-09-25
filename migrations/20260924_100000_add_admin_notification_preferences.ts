import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Adds the four admin-only email-preference toggles to `users.notificationPreferences`
// (account requests, overdue returns, new reviews, activity-log events). Kept on the
// shared group so the settings UI reads/writes one place; member toggles are untouched.
// Hand-written instead of `payload migrate:create`: the generator currently prompts on
// pre-existing snapshot drift (the MCP api-keys table logged in 20260922_092238).
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(
    sql`ALTER TABLE "users" ADD COLUMN "notification_preferences_account_requests" boolean DEFAULT true;`,
  )
  await db.execute(
    sql`ALTER TABLE "users" ADD COLUMN "notification_preferences_overdue_returns" boolean DEFAULT true;`,
  )
  await db.execute(
    sql`ALTER TABLE "users" ADD COLUMN "notification_preferences_new_reviews" boolean DEFAULT true;`,
  )
  await db.execute(
    sql`ALTER TABLE "users" ADD COLUMN "notification_preferences_activity_log_events" boolean DEFAULT true;`,
  )
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(
    sql`ALTER TABLE "users" DROP COLUMN "notification_preferences_activity_log_events";`,
  )
  await db.execute(sql`ALTER TABLE "users" DROP COLUMN "notification_preferences_new_reviews";`)
  await db.execute(sql`ALTER TABLE "users" DROP COLUMN "notification_preferences_overdue_returns";`)
  await db.execute(
    sql`ALTER TABLE "users" DROP COLUMN "notification_preferences_account_requests";`,
  )
}
