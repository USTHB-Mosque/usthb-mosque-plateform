import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "loans" DROP COLUMN "extension_request_status";
  ALTER TABLE "loans" DROP COLUMN "extension_request_requested_days";
  ALTER TABLE "loans" DROP COLUMN "extension_request_requested_at";
  ALTER TABLE "loans" DROP COLUMN "extension_request_new_due_date";
  ALTER TABLE "loans" DROP COLUMN "extension_request_resolved_at";
  DROP TYPE "public"."enum_loans_extension_request_status";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_loans_extension_request_status" AS ENUM('none', 'pending', 'approved', 'rejected');
  ALTER TABLE "loans" ADD COLUMN "extension_request_status" "enum_loans_extension_request_status" DEFAULT 'none';
  ALTER TABLE "loans" ADD COLUMN "extension_request_requested_days" numeric;
  ALTER TABLE "loans" ADD COLUMN "extension_request_requested_at" timestamp(3) with time zone;
  ALTER TABLE "loans" ADD COLUMN "extension_request_new_due_date" timestamp(3) with time zone;
  ALTER TABLE "loans" ADD COLUMN "extension_request_resolved_at" timestamp(3) with time zone;`)
}
