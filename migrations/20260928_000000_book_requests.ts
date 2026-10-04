import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// #152: the generator tried to rename the already-migrated MCP table to
// notifications (stale snapshot drift); only the new book-requests table is
// introduced here. No existing collection or data is renamed.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`CREATE SEQUENCE IF NOT EXISTS "book_requests_id_seq";`)
  await db.execute(
    sql`CREATE TYPE "enum_book_requests_status" AS ENUM ('pending', 'approved', 'rejected');`,
  )
  await db.execute(sql`
    CREATE TABLE "book_requests" (
      "id" integer DEFAULT nextval('book_requests_id_seq') NOT NULL,
      "user_id" integer NOT NULL,
      "title" varchar NOT NULL,
      "author" varchar,
      "description" varchar,
      "status" "enum_book_requests_status" DEFAULT 'pending' NOT NULL,
      "admin_note" varchar,
      "updated_at" timestamptz DEFAULT now() NOT NULL,
      "created_at" timestamptz DEFAULT now() NOT NULL,
      PRIMARY KEY ("id")
    );
  `)
  await db.execute(sql`ALTER SEQUENCE "book_requests_id_seq" OWNED BY "book_requests"."id";`)
  await db.execute(
    sql`ALTER TABLE "book_requests" ADD CONSTRAINT "book_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;`,
  )
  await db.execute(sql`CREATE INDEX "book_requests_user_idx" ON "book_requests" ("user_id");`)
  await db.execute(sql`CREATE INDEX "book_requests_status_idx" ON "book_requests" ("status");`)
  await db.execute(
    sql`CREATE INDEX "book_requests_created_at_idx" ON "book_requests" ("created_at");`,
  )
  await db.execute(
    sql`CREATE INDEX "book_requests_updated_at_idx" ON "book_requests" ("updated_at");`,
  )
  await db.execute(
    sql`ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "book_requests_id" integer;`,
  )
  await db.execute(
    sql`ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_book_requests_fk" FOREIGN KEY ("book_requests_id") REFERENCES "book_requests" ("id") ON DELETE CASCADE;`,
  )
  await db.execute(
    sql`CREATE INDEX "payload_locked_documents_rels_book_requests_id_idx" ON "payload_locked_documents_rels" ("book_requests_id");`,
  )
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(
    sql`ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_book_requests_fk";`,
  )
  await db.execute(sql`DROP INDEX IF EXISTS "payload_locked_documents_rels_book_requests_id_idx";`)
  await db.execute(
    sql`ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "book_requests_id";`,
  )
  await db.execute(sql`DROP TABLE IF EXISTS "book_requests";`)
  await db.execute(sql`DROP SEQUENCE IF EXISTS "book_requests_id_seq";`)
  await db.execute(sql`DROP TYPE IF EXISTS "enum_book_requests_status";`)
}
