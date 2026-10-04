import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Adds the 'first_admin_created' value to the activity-log action enum.
// Only the enum change is included: `payload migrate:create` also picked up
// drift from a local-only `payload_mcp_api_keys` table created by an MCP tool;
// that table does not belong to the app schema and must not be touched here.
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_users_activity_log_action" ADD VALUE 'first_admin_created';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users_activity_log" ALTER COLUMN "action" SET DATA TYPE text;
   DROP TYPE "public"."enum_users_activity_log_action";
   CREATE TYPE "public"."enum_users_activity_log_action" AS ENUM('login', 'password_changed', 'profile_updated', 'account_verified', 'account_created');
   ALTER TABLE "users_activity_log" ALTER COLUMN "action" SET DATA TYPE "public"."enum_users_activity_log_action" USING "action"::"public"."enum_users_activity_log_action";`)
}
