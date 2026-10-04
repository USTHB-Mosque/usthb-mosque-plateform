import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * D1 backfill (#153).
 *
 * `pickup_window_expires_at` is stamped by the `loans` lifecycle hook, but only
 * on an *update* transition to `accepted` — a Loan that was already accepted
 * before the column existed, or one created directly with that status (which is
 * how the seed writes them), carries no window and would sit on the shelf
 * forever. That is precisely the hole the Pickup Window closes, so the columns
 * alone would leave it open for every pre-existing Loan.
 *
 * The window runs 48h from acceptance. `created_at` is the only timestamp that
 * stands in for acceptance on rows that predate the field, and it errs strict:
 * anything accepted more than one window ago expires on the first sweep after
 * this runs, rather than being granted a fresh window at migration time. The
 * members holding those copies were never told about a rule that did not exist
 * when they accepted — accepted as the cost of a rule that can only be applied
 * to loans from now on.
 *
 * The length comes from Settings, mirroring `getLoanSettings`, so the backfill
 * and the hook cannot disagree the moment `pickup_window_hours` is edited. The
 * range guard reproduces `positiveInt`'s fallback to the default: a zero or
 * negative value here would stamp every accepted Loan as already expired and
 * hand the whole platform a no-show on deploy.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "loans"
    SET "pickup_window_expires_at" =
      "created_at" + COALESCE(
        (
          SELECT CASE
            WHEN "pickup_window_hours" >= 1 THEN "pickup_window_hours"
            ELSE 48
          END
          FROM "settings"
          LIMIT 1
        ),
        48
      ) * interval '1 hour'
    WHERE "status" = 'accepted'
      AND "pickup_window_expires_at" IS NULL;
  `)
}

/**
 * No-op, deliberately. There is no way to tell a window this migration wrote
 * from one an acceptance stamped afterwards, and clearing every window would
 * silently un-expire Loans the sweep has already refused. The data leaves with
 * the column: `20260930_000000_loan_pickup_window.down` drops it.
 */
export async function down(_args: MigrateDownArgs): Promise<void> {}
