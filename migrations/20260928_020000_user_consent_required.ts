import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// #152: `consentGiven` became schema-required, which Payload's postgres adapter
// materialises as a NOT NULL column. The existing `users.consent_given` column
// was created nullable, so it has to be tightened here.
//
// The only change is the constraint. Existing values are left exactly as they
// are: an account already sitting at `false` had, at some point, no recorded
// consent, and rewriting that to `true` would fabricate an audit record under
// Law 18-07. Rows that are NULL — meaning "never recorded" — are normalised to
// `false`, the column's own default, so the constraint can be applied. An admin
// can still record consent properly through the normal flow.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`UPDATE "users" SET "consent_given" = false WHERE "consent_given" IS NULL;`)
  await db.execute(sql`ALTER TABLE "users" ALTER COLUMN "consent_given" SET NOT NULL;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "users" ALTER COLUMN "consent_given" DROP NOT NULL;`)
}
