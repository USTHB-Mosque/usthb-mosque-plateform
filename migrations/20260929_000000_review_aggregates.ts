import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// #25: `books.rating_count` / `books.average_rating` were never written by
// anything, so every number on the site is whatever the seed invented (book 52
// claimed 30 ratings at an average of 5 against a single real review). The
// review hooks now maintain the aggregate; this migration gives `articles` the
// same pair (an article is a review target too, #103) and replaces the fiction
// on every existing book with the aggregate of the review rows that exist.
//
// The backfill is deliberately not `up`-only state restoration: `down` cannot
// put the invented numbers back, because they were never derived from anything
// worth restoring. It drops the article columns and leaves the books honest.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "articles" ADD COLUMN "rating_count" numeric DEFAULT 0;`)
  await db.execute(sql`ALTER TABLE "articles" ADD COLUMN "average_rating" numeric DEFAULT 0;`)

  // Books that have reviews: the real count and mean, rounded to the same two
  // decimals the hook stores.
  await db.execute(sql`
    UPDATE "books" AS "b"
    SET
      "rating_count" = "r"."count",
      "average_rating" = "r"."avg"
    FROM (
      SELECT "book_id", COUNT(*) AS "count", ROUND(AVG("rating"), 2) AS "avg"
      FROM "reviews"
      WHERE "book_id" IS NOT NULL
      GROUP BY "book_id"
    ) AS "r"
    WHERE "r"."book_id" = "b"."id";
  `)

  // Books with no reviews at all: the invented numbers go to zero, which is
  // what a real recompute would leave behind.
  await db.execute(sql`
    UPDATE "books"
    SET "rating_count" = 0, "average_rating" = 0
    WHERE NOT EXISTS (
      SELECT 1 FROM "reviews" AS "r" WHERE "r"."book_id" = "books"."id"
    );
  `)

  // The same recompute for the articles that already carry reviews.
  await db.execute(sql`
    UPDATE "articles" AS "a"
    SET
      "rating_count" = "r"."count",
      "average_rating" = "r"."avg"
    FROM (
      SELECT "article_id", COUNT(*) AS "count", ROUND(AVG("rating"), 2) AS "avg"
      FROM "reviews"
      WHERE "article_id" IS NOT NULL
      GROUP BY "article_id"
    ) AS "r"
    WHERE "r"."article_id" = "a"."id";
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "articles" DROP COLUMN IF EXISTS "average_rating";`)
  await db.execute(sql`ALTER TABLE "articles" DROP COLUMN IF EXISTS "rating_count";`)
}
