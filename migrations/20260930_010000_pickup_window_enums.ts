import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// #153: the two Postgres enums the Pickup Window work extends.
//
// - `enum_logs_action` gains the audit rows the sweep writes (a lapsed window),
//   the admin reschedule, and the lifting of a no-show block, so SPEC's claim
//   that the audit log records each expiry event is true in the schema and not
//   only in the prose — and so an admin lifting a block is accountable too.
// - `enum_payload_jobs_task_slug` (and its log twin) gain the scheduled sweep
//   task. Both are created in 20260928_010000_payload_jobs with one task slug,
//   so the new queue needs its own value before Payload can write a job row.
//
// Adding values is the same shape as
// 20260922_092238_add_first_admin_created_action, which extended an action enum
// the same way. Values are only ever appended, never removed, so an existing
// row can never reference a value that disappears.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`ALTER TYPE "enum_logs_action" ADD VALUE 'loan_expired';`)
  await db.execute(sql`ALTER TYPE "enum_logs_action" ADD VALUE 'loan_rescheduled';`)
  await db.execute(sql`ALTER TYPE "enum_logs_action" ADD VALUE 'user_block_lifted';`)
  await db.execute(sql`ALTER TYPE "enum_payload_jobs_task_slug" ADD VALUE 'expirePickupWindows';`)
  await db.execute(
    sql`ALTER TYPE "enum_payload_jobs_log_task_slug" ADD VALUE 'expirePickupWindows';`,
  )
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // Deliberately a no-op. Both enums back NOT NULL rows — `logs` is an
  // append-only audit log whose access rules promise rows are never removed,
  // and the job log is the runner's own history — so dropping a value rows
  // already carry would either fail the cast or destroy that history.
  // Postgres cannot drop an enum value cleanly in any case.
}
