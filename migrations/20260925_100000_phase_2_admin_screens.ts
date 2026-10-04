import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Phase 2 admin screens (#103):
//   - Enforce the review "exactly one of book/article" rule at the database
//     level too (the collection's beforeValidate hook already enforces it on
//     Payload writes; this CHECK makes direct SQL honor it as well).
//   - Indexes the loans-based analytics queries need so they do not table scan:
//     day grouping by loan_date, type grouping over the books_type join table,
//     and book-target review filtering.
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(
    sql`ALTER TABLE "reviews" ADD CONSTRAINT "reviews_exactly_one_target" CHECK (
      (("book_id") IS NOT NULL)::int + (("article_id") IS NOT NULL)::int = 1
    );`,
  )
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS "reviews_book_idx" ON "reviews" USING btree ("book_id");`,
  )
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS "loans_loan_date_idx" ON "loans" USING btree ("loan_date");`,
  )
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS "books_type_value_idx" ON "books_type" USING btree ("value");`,
  )
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP INDEX IF EXISTS "books_type_value_idx";`)
  await db.execute(sql`DROP INDEX IF EXISTS "loans_loan_date_idx";`)
  await db.execute(sql`DROP INDEX IF EXISTS "reviews_book_idx";`)
  await db.execute(
    sql`ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "reviews_exactly_one_target";`,
  )
}
