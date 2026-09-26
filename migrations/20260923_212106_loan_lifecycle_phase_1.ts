import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_situation" AS ENUM('student', 'doctoral', 'teacher', 'staff');
  CREATE TYPE "public"."enum_loan_extensions_status" AS ENUM('pending', 'approved', 'refused');
  CREATE TABLE "waitlist_entries" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"book_id" integer NOT NULL,
  	"user_id" integer NOT NULL,
  	"position" numeric NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "loan_extensions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"loan_id" integer NOT NULL,
  	"user_id" integer NOT NULL,
  	"status" "enum_loan_extensions_status" DEFAULT 'pending',
  	"days" numeric NOT NULL,
  	"reason" varchar,
  	"admin_response" varchar,
  	"original_due_date" timestamp(3) with time zone,
  	"new_due_date" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"default_loan_duration_days" numeric DEFAULT 14,
  	"borrow_limit" numeric DEFAULT 5,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "loans" ALTER COLUMN "status" SET DATA TYPE text;
  ALTER TABLE "loans" ALTER COLUMN "status" SET DEFAULT 'pending'::text;
  DROP TYPE "public"."enum_loans_status";
  CREATE TYPE "public"."enum_loans_status" AS ENUM('pending', 'accepted', 'picked_up', 'returned', 'refused');
  ALTER TABLE "loans" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."enum_loans_status";
  ALTER TABLE "loans" ALTER COLUMN "status" SET DATA TYPE "public"."enum_loans_status" USING (
    CASE "status"::text
      WHEN 'approved' THEN 'accepted'::text
      WHEN 'overdue' THEN 'picked_up'::text
      ELSE "status"::text
    END
  )::"public"."enum_loans_status";
  ALTER TABLE "loans" ALTER COLUMN "due_date" DROP NOT NULL;
  ALTER TABLE "users" ADD COLUMN "speciality" varchar;
  ALTER TABLE "users" ADD COLUMN "card_id" varchar;
  ALTER TABLE "users" ADD COLUMN "situation" "enum_users_situation";
  ALTER TABLE "books" ADD COLUMN "code" varchar;
  ALTER TABLE "books" ADD COLUMN "loan_duration_days" numeric;
  ALTER TABLE "loans" ADD COLUMN "pickup_hour" varchar;
  ALTER TABLE "loans" ADD COLUMN "pickup_code" varchar;
  ALTER TABLE "loans" ADD COLUMN "refusal_reason" varchar;
  ALTER TABLE "loans" ADD COLUMN "overdue_notified" boolean DEFAULT false;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "waitlist_entries_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "loan_extensions_id" integer;
  ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "loan_extensions" ADD CONSTRAINT "loan_extensions_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "loan_extensions" ADD CONSTRAINT "loan_extensions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "waitlist_entries_book_idx" ON "waitlist_entries" USING btree ("book_id");
  CREATE INDEX "waitlist_entries_user_idx" ON "waitlist_entries" USING btree ("user_id");
  CREATE INDEX "waitlist_entries_updated_at_idx" ON "waitlist_entries" USING btree ("updated_at");
  CREATE INDEX "waitlist_entries_created_at_idx" ON "waitlist_entries" USING btree ("created_at");
  CREATE INDEX "loan_extensions_loan_idx" ON "loan_extensions" USING btree ("loan_id");
  CREATE INDEX "loan_extensions_user_idx" ON "loan_extensions" USING btree ("user_id");
  CREATE INDEX "loan_extensions_status_idx" ON "loan_extensions" USING btree ("status");
  CREATE INDEX "loan_extensions_updated_at_idx" ON "loan_extensions" USING btree ("updated_at");
  CREATE INDEX "loan_extensions_created_at_idx" ON "loan_extensions" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_waitlist_entries_fk" FOREIGN KEY ("waitlist_entries_id") REFERENCES "public"."waitlist_entries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_loan_extensions_fk" FOREIGN KEY ("loan_extensions_id") REFERENCES "public"."loan_extensions"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "loans_status_idx" ON "loans" USING btree ("status");
  CREATE UNIQUE INDEX "loans_pickup_code_idx" ON "loans" USING btree ("pickup_code");
  CREATE INDEX "payload_locked_documents_rels_waitlist_entries_id_idx" ON "payload_locked_documents_rels" USING btree ("waitlist_entries_id");
  CREATE INDEX "payload_locked_documents_rels_loan_extensions_id_idx" ON "payload_locked_documents_rels" USING btree ("loan_extensions_id");`)

  // ---- data migration: existing loans onto the new states ----

  // Accepted loans (formerly approved) keep a copy reserved: backfill a
  // deterministic, unique pickup code and stamp the pickup date to the row's
  // creation date. `${book_id}/${loan_id}/${yy}` — the loan id guarantees
  // uniqueness.
  await db.execute(sql`
    UPDATE "loans"
    SET "pickup_code" = "book_id" || '/' || "id" || '/' || to_char("created_at", 'YY'),
        "pickup_date" = "created_at",
        "pickup_hour" = to_char("created_at", 'HH24:MI')
    WHERE "status" = 'accepted' AND "pickup_code" IS NULL;`)

  // Under the new model a pending loan holds nothing: its due date is stamped
  // only when the loan is picked up.
  await db.execute(sql`
    UPDATE "loans" SET "due_date" = NULL WHERE "status" = 'pending';`)

  // Reconcile copy counts to the new model: only accepted and picked-up loans
  // hold copies, so restore anything the old request-time decrement took for
  // loans that are now pending. Grouping over every loaned book (with a
  // FILTER for the holders) restores books whose loans are all pending too.
  await db.execute(sql`
    UPDATE "books"
    SET "available_books" = GREATEST("books"."total_books" - COALESCE(holds.held, 0), 0)
    FROM (
      SELECT "book_id",
             COUNT(*) FILTER (WHERE "status" IN ('accepted', 'picked_up')) AS held
      FROM "loans"
      GROUP BY "book_id"
    ) AS holds
    WHERE "books"."id" = holds."book_id";`)

  // Seed the Settings global so reads always return real values.
  await db.execute(sql`
    INSERT INTO "settings" ("default_loan_duration_days", "borrow_limit", "updated_at", "created_at")
    SELECT 14, 5, now(), now()
    WHERE NOT EXISTS (SELECT 1 FROM "settings");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "waitlist_entries" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "loan_extensions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "settings" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "waitlist_entries" CASCADE;
  DROP TABLE "loan_extensions" CASCADE;
  DROP TABLE "settings" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_waitlist_entries_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_loan_extensions_fk";
  
  ALTER TABLE "loans" ALTER COLUMN "status" SET DATA TYPE text;
  ALTER TABLE "loans" ALTER COLUMN "status" SET DEFAULT 'pending'::text;
  DROP TYPE "public"."enum_loans_status";
  CREATE TYPE "public"."enum_loans_status" AS ENUM('pending', 'approved', 'returned', 'overdue');
  ALTER TABLE "loans" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."enum_loans_status";
  -- Best-effort reverse mapping; refused has no old state and falls back to
  -- returned so the downgrade never fails on the type cast.
  ALTER TABLE "loans" ALTER COLUMN "status" SET DATA TYPE "public"."enum_loans_status" USING (
    CASE "status"::text
      WHEN 'accepted' THEN 'approved'::text
      WHEN 'picked_up' THEN 'overdue'::text
      WHEN 'refused' THEN 'returned'::text
      ELSE "status"::text
    END
  )::"public"."enum_loans_status";
  DROP INDEX "loans_status_idx";
  DROP INDEX "loans_pickup_code_idx";
  DROP INDEX "payload_locked_documents_rels_waitlist_entries_id_idx";
  DROP INDEX "payload_locked_documents_rels_loan_extensions_id_idx";
  ALTER TABLE "loans" ALTER COLUMN "due_date" SET NOT NULL;
  ALTER TABLE "users" DROP COLUMN "speciality";
  ALTER TABLE "users" DROP COLUMN "card_id";
  ALTER TABLE "users" DROP COLUMN "situation";
  ALTER TABLE "books" DROP COLUMN "code";
  ALTER TABLE "books" DROP COLUMN "loan_duration_days";
  ALTER TABLE "loans" DROP COLUMN "pickup_hour";
  ALTER TABLE "loans" DROP COLUMN "pickup_code";
  ALTER TABLE "loans" DROP COLUMN "refusal_reason";
  ALTER TABLE "loans" DROP COLUMN "overdue_notified";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "waitlist_entries_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "loan_extensions_id";
  DROP TYPE "public"."enum_users_situation";
  DROP TYPE "public"."enum_loan_extensions_status";`)
}
