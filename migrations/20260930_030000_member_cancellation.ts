import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// #153, D6 - Cancelability: a member can now withdraw a request they have not
// collected yet, and the withdrawal is recorded like every other transition.
//
// - `enum_loans_status` gains `cancelled`: the borrower's own withdrawal of a
//   `pending` or `accepted` Loan. Deliberately not `refused` — a refusal is the
//   administration's decision and notifies the borrower with a reason, while a
//   cancellation is the borrower acting on their own request: no notification,
//   no `noShowCount`, and the reserved copy (if any) released immediately.
// - `enum_loan_extensions_status` gains `withdrawn`: the same withdrawal for an
//   extension request nobody has decided yet. Once approved the due date has
//   moved and there is nothing to undo (D6).
// - `enum_logs_action` gains the two audit rows those transitions write, so
//   SPEC's claim that each transition is recorded stays true once members can
//   perform them — and so an admin seeing a reserved copy return to the shelf
//   can tell who released it and when.
//
// Same append-only shape as 20260930_010000_pickup_window_enums. Values are
// only ever added, never removed, so no existing row can reference a value that
// disappears.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`ALTER TYPE "enum_loans_status" ADD VALUE 'cancelled';`)
  await db.execute(sql`ALTER TYPE "enum_loan_extensions_status" ADD VALUE 'withdrawn';`)
  await db.execute(sql`ALTER TYPE "enum_logs_action" ADD VALUE 'loan_cancelled';`)
  await db.execute(sql`ALTER TYPE "enum_logs_action" ADD VALUE 'extension_withdrawn';`)
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // Deliberately a no-op. All three enums back NOT NULL rows: `logs` is an
  // append-only audit log whose access rules promise rows are never removed,
  // and the loan and extension rows already carry the new states. Dropping a
  // value those rows hold would fail the cast or destroy the history, and
  // Postgres cannot drop an enum value cleanly in any case.
}
