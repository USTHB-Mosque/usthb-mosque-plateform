import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// migrate:create used the pre-September-20 snapshot and repeated already-shipped
// schema changes. Keep only the new generated table/index/lock relations here;
// the accompanying generated snapshot reconciles that historical drift.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE "account_security" (
      "id" serial PRIMARY KEY NOT NULL,
      "user_id" integer NOT NULL,
      "reauthenticated_sessions" jsonb DEFAULT '{}'::jsonb NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    ALTER TABLE "account_security" ADD CONSTRAINT "account_security_user_id_users_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
    CREATE UNIQUE INDEX "account_security_user_idx" ON "account_security" ("user_id");
    CREATE INDEX "account_security_updated_at_idx" ON "account_security" ("updated_at");
    CREATE INDEX "account_security_created_at_idx" ON "account_security" ("created_at");
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "account_security_id" integer;
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_account_security_fk"
      FOREIGN KEY ("account_security_id") REFERENCES "account_security"("id") ON DELETE CASCADE;
    CREATE INDEX "payload_locked_documents_rels_account_security_id_idx"
      ON "payload_locked_documents_rels" ("account_security_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "account_security_id";
    DROP TABLE "account_security";
  `)
}
