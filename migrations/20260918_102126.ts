import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_activity_log_action" AS ENUM('login', 'password_changed', 'profile_updated', 'account_verified', 'account_created');
  CREATE TABLE "users_activity_log" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"action" "enum_users_activity_log_action" NOT NULL,
  	"timestamp" timestamp(3) with time zone NOT NULL,
  	"metadata" varchar
  );
  
  ALTER TABLE "users_activity_log" ADD CONSTRAINT "users_activity_log_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_activity_log_order_idx" ON "users_activity_log" USING btree ("_order");
  CREATE INDEX "users_activity_log_parent_id_idx" ON "users_activity_log" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_activity_log" CASCADE;
  DROP TYPE "public"."enum_users_activity_log_action";`)
}
