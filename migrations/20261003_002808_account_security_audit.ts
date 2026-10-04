import { type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_logs_action" ADD VALUE IF NOT EXISTS 'account_security_updated';`)
}

export async function down(): Promise<void> {
  // Keep the additive enum value: deleting/relabeling append-only security
  // history to roll back application code would destroy the audit trail.
}
