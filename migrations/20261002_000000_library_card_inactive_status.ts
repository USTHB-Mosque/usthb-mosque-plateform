import { sql, type MigrateUpArgs, type MigrateDownArgs } from '@payloadcms/db-postgres'

// #145: the cards admin screen needs three distinct counts, so a card gets a
// third state between "in circulation" and "retired for good": `inactive`, a
// withdrawn card an admin can bring back. `active` and `archived` are unchanged,
// and no row is rewritten — a card only leaves `active` when an admin says so.
// With `inactive` a card is always in exactly one of the three states, so the
// column stops being nullable and the admin transitions can read it directly.
//
// The two new log actions are the audit trail for issuing a card and for moving
// one between states; `card_archived` already existed but nothing wrote it until
// the cards screen shipped.
//
// Postgres cannot drop an enum value, so `down` rebuilds both enums from the
// values still in use and casts the columns back, exactly as the earlier enum
// migrations in this directory do. A card withdrawn under `inactive` has nowhere
// to go in the old schema, so `down` folds it back to `active` rather than
// failing the cast.
const CARD_STATUSES = ['active', 'inactive', 'archived'] as const
const PREVIOUS_CARD_STATUSES = ['active', 'archived'] as const
const LOG_ACTIONS = [
  'book_created',
  'book_updated',
  'book_deleted',
  'book_imported',
  'article_created',
  'article_updated',
  'article_deleted',
  'activity_created',
  'activity_updated',
  'activity_deleted',
  'review_deleted',
  'loan_approved',
  'loan_refused',
  'loan_expired',
  'loan_rescheduled',
  'loan_picked_up',
  'loan_returned',
  'loan_cancelled',
  'extension_approved',
  'extension_refused',
  'extension_withdrawn',
  'user_verified',
  'user_rejected',
  'user_block_lifted',
  'user_role_changed',
  'user_deleted',
  'users_imported',
  'card_issued',
  'card_status_changed',
  'card_archived',
] as const
const PREVIOUS_LOG_ACTIONS = LOG_ACTIONS.filter(
  (action) => action !== 'card_issued' && action !== 'card_status_changed',
)

const enumLiteral = (values: readonly string[]) => values.map((value) => `'${value}'`).join(',')

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(
    sql`ALTER TYPE "public"."enum_library_cards_status" ADD VALUE IF NOT EXISTS 'inactive';`,
  )
  await db.execute(
    sql`ALTER TYPE "public"."enum_logs_action" ADD VALUE IF NOT EXISTS 'card_issued';`,
  )
  await db.execute(
    sql`ALTER TYPE "public"."enum_logs_action" ADD VALUE IF NOT EXISTS 'card_status_changed';`,
  )
  await db.execute(sql`UPDATE "library_cards" SET "status" = 'active' WHERE "status" IS NULL;`)
  await db.execute(sql`ALTER TABLE "library_cards" ALTER COLUMN "status" SET NOT NULL;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // The column default and NOT NULL both depend on the enum type, so they have
  // to go before it can be dropped.
  await db.execute(sql`ALTER TABLE "library_cards" ALTER COLUMN "status" DROP NOT NULL;`)
  await db.execute(sql`ALTER TABLE "library_cards" ALTER COLUMN "status" DROP DEFAULT;`)
  await db.execute(sql`
    ALTER TABLE "library_cards" ALTER COLUMN "status" SET DATA TYPE text;
    DROP TYPE "public"."enum_library_cards_status";
    CREATE TYPE "public"."enum_library_cards_status" AS ENUM(${sql.raw(
      enumLiteral(PREVIOUS_CARD_STATUSES),
    )});
    ALTER TABLE "library_cards" ALTER COLUMN "status" SET DATA TYPE "public"."enum_library_cards_status"
      USING CASE "status" WHEN 'inactive' THEN 'active' ELSE "status" END::"public"."enum_library_cards_status";`)
  await db.execute(sql`ALTER TABLE "library_cards" ALTER COLUMN "status" SET DEFAULT 'active';`)

  // Rolling back the feature removes the audit lines it produced: the old enum
  // has nowhere to put `card_issued` or `card_status_changed`, and rewriting
  // them to a different action would misstate what happened.
  await db.execute(
    sql`DELETE FROM "logs" WHERE "action" IN ('card_issued', 'card_status_changed');`,
  )
  await db.execute(sql`
    ALTER TABLE "logs" ALTER COLUMN "action" SET DATA TYPE text;
    DROP TYPE "public"."enum_logs_action";
    CREATE TYPE "public"."enum_logs_action" AS ENUM(${sql.raw(enumLiteral(PREVIOUS_LOG_ACTIONS))});
    ALTER TABLE "logs" ALTER COLUMN "action" SET DATA TYPE "public"."enum_logs_action" USING "action"::"public"."enum_logs_action";`)
}
