import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// #153: the Pickup Window (D1), the no-show counter and block (D2) and the
// configurable window length, plus the D7 borrow-limit backfill.
//
// Hand-written rather than generated: the generator still trips over the same
// pre-existing snapshot drift on the `notifications` table that
// 20260928_000000_book_requests and 20260928_010000_payload_jobs record, and
// offers to rename an unrelated table into it. No existing table or data is
// renamed here — only columns are added.
//
// Column types follow what the adapter generates for these field definitions
// (`number` -> numeric, `date` -> timestamp(3) with time zone), as captured
// from 20260923_212106_loan_lifecycle_phase_1.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  // D1: the deadline for collecting an accepted loan, stamped from the
  // Settings window at accept time and refreshed by an admin reschedule.
  await db.execute(
    sql`ALTER TABLE "loans" ADD COLUMN "pickup_window_expires_at" timestamp(3) with time zone;`,
  )
  await db.execute(
    sql`CREATE INDEX "loans_pickup_window_expires_at_idx" ON "loans" USING btree ("pickup_window_expires_at");`,
  )

  // D2: a count plus a block flag on the user, deliberately not a history
  // collection — the audit log already records each expiry event.
  await db.execute(sql`ALTER TABLE "users" ADD COLUMN "no_show_count" numeric DEFAULT 0;`)
  await db.execute(
    sql`ALTER TABLE "users" ADD COLUMN "borrowing_blocked_at" timestamp(3) with time zone;`,
  )

  // D1: how long the window is. Existing rows pick up the column default, so
  // the seeded Settings row reads 48 without an explicit rewrite.
  await db.execute(sql`ALTER TABLE "settings" ADD COLUMN "pickup_window_hours" numeric DEFAULT 48;`)

  // D7: the shipped borrow limit was 5, in two places — the
  // DEFAULT_BORROW_LIMIT constant (fixed in this change, which the Settings
  // field's defaultValue derives from) and the row this migration seeds.
  // Guarded on the shipped value so a limit an admin deliberately chose is
  // left exactly as they set it.
  await db.execute(sql`UPDATE "settings" SET "borrow_limit" = 3 WHERE "borrow_limit" = 5;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // The D7 backfill is deliberately not reversed: the previous per-row value
  // was not recorded, and guessing "3 meant 5" would overwrite a limit an
  // admin had genuinely set to 3.
  await db.execute(sql`DROP INDEX IF EXISTS "loans_pickup_window_expires_at_idx";`)
  await db.execute(sql`ALTER TABLE "loans" DROP COLUMN IF EXISTS "pickup_window_expires_at";`)
  await db.execute(sql`ALTER TABLE "users" DROP COLUMN IF EXISTS "no_show_count";`)
  await db.execute(sql`ALTER TABLE "users" DROP COLUMN IF EXISTS "borrowing_blocked_at";`)
  await db.execute(sql`ALTER TABLE "settings" DROP COLUMN IF EXISTS "pickup_window_hours";`)
}
