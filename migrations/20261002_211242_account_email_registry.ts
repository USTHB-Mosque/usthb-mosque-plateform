import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "account_emails" (
    "id" serial PRIMARY KEY NOT NULL,
    "user_id" integer NOT NULL,
    "address" varchar NOT NULL,
    "verified_at" timestamp(3) with time zone,
    "pending_until" timestamp(3) with time zone,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "account_emails_id" integer;
  ALTER TABLE "account_emails" ADD CONSTRAINT "account_emails_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "account_emails_user_idx" ON "account_emails" USING btree ("user_id");
  CREATE UNIQUE INDEX "account_emails_address_idx" ON "account_emails" USING btree ("address");
  CREATE INDEX "account_emails_updated_at_idx" ON "account_emails" USING btree ("updated_at");
  CREATE INDEX "account_emails_created_at_idx" ON "account_emails" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_account_emails_fk" FOREIGN KEY ("account_emails_id") REFERENCES "public"."account_emails"("id") ON DELETE cascade ON UPDATE no action;
   CREATE INDEX "payload_locked_documents_rels_account_emails_id_idx" ON "payload_locked_documents_rels" USING btree ("account_emails_id");
   -- Reserve legacy primary addresses, without pretending document approval
   -- proved ownership of their mailboxes.
   INSERT INTO "account_emails" ("user_id", "address") SELECT "id", lower(trim("email")) FROM "users";
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "account_emails_id";
   DROP TABLE "account_emails";`)
}
