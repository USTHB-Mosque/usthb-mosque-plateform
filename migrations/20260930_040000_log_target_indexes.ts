import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// #165 — the member activity log reads `logs` through a rule that matches on
// `targetType` + `targetId` (my user row, my loan rows). Those two columns were
// plain unindexed text, so every member visit to /user/activity-log would scan
// the whole audit table.
//
// Hand-written rather than generated: the generator still trips over the same
// pre-existing snapshot drift on the `notifications` table that
// 20260928_000000_book_requests, 20260928_010000_payload_jobs and
// 20260930_000000_loan_pickup_window record, and offers to rename an unrelated
// table into it. Only indexes are added — no table or column changes.
//
// Names follow the adapter's `${table}_${column}_idx` convention so a future
// schema push recognizes them instead of proposing a change.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS "logs_target_type_idx" ON "logs" USING btree ("target_type");`,
  )
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS "logs_target_id_idx" ON "logs" USING btree ("target_id");`,
  )
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP INDEX IF EXISTS "logs_target_id_idx";`)
  await db.execute(sql`DROP INDEX IF EXISTS "logs_target_type_idx";`)
}
