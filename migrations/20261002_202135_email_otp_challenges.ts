import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_auth_challenges_purpose" AS ENUM('enroll', 'login', 'reauth', 'email');
  CREATE TABLE "auth_challenges" (
    "id" serial PRIMARY KEY NOT NULL,
    "user_id" integer NOT NULL,
    "purpose" "enum_auth_challenges_purpose" NOT NULL,
    "nonce_hash" varchar NOT NULL,
    "code_hash" varchar NOT NULL,
    "email" varchar NOT NULL,
    "session_id" varchar,
    "revision" numeric NOT NULL,
    "attempts" numeric DEFAULT 0 NOT NULL,
    "expires_at" timestamp(3) with time zone NOT NULL,
    "consumed_at" timestamp(3) with time zone,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  ALTER TABLE "account_security" ADD COLUMN "email_two_factor_enabled" boolean DEFAULT false NOT NULL;
  ALTER TABLE "account_security" ADD COLUMN "revision" numeric DEFAULT 0 NOT NULL;
  ALTER TABLE "account_security" ADD COLUMN "recovery_code_hashes" jsonb DEFAULT '[]'::jsonb NOT NULL;
  ALTER TABLE "account_security" ADD COLUMN "assured_sessions" jsonb DEFAULT '{}'::jsonb NOT NULL;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "auth_challenges_id" integer;
  ALTER TABLE "auth_challenges" ADD CONSTRAINT "auth_challenges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "auth_challenges_user_idx" ON "auth_challenges" USING btree ("user_id");
  CREATE INDEX "auth_challenges_purpose_idx" ON "auth_challenges" USING btree ("purpose");
  CREATE UNIQUE INDEX "auth_challenges_nonce_hash_idx" ON "auth_challenges" USING btree ("nonce_hash");
  CREATE INDEX "auth_challenges_expires_at_idx" ON "auth_challenges" USING btree ("expires_at");
  CREATE INDEX "auth_challenges_updated_at_idx" ON "auth_challenges" USING btree ("updated_at");
  CREATE INDEX "auth_challenges_created_at_idx" ON "auth_challenges" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_auth_challenges_fk" FOREIGN KEY ("auth_challenges_id") REFERENCES "public"."auth_challenges"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_auth_challenges_id_idx" ON "payload_locked_documents_rels" USING btree ("auth_challenges_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "auth_challenges_id";
  DROP TABLE "auth_challenges";
  ALTER TABLE "account_security" DROP COLUMN "email_two_factor_enabled";
  ALTER TABLE "account_security" DROP COLUMN "revision";
  ALTER TABLE "account_security" DROP COLUMN "recovery_code_hashes";
  ALTER TABLE "account_security" DROP COLUMN "assured_sessions";
  DROP TYPE "public"."enum_auth_challenges_purpose";`)
}
