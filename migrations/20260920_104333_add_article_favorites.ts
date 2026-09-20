import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "article_favorites" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"article_id" integer NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "users" ADD COLUMN "first_name" varchar;
  ALTER TABLE "users" ADD COLUMN "last_name" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "article_favorites_id" integer;
  ALTER TABLE "article_favorites" ADD CONSTRAINT "article_favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "article_favorites" ADD CONSTRAINT "article_favorites_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "article_favorites_user_idx" ON "article_favorites" USING btree ("user_id");
  CREATE INDEX "article_favorites_article_idx" ON "article_favorites" USING btree ("article_id");
  CREATE INDEX "article_favorites_updated_at_idx" ON "article_favorites" USING btree ("updated_at");
  CREATE INDEX "article_favorites_created_at_idx" ON "article_favorites" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_article_favorites_fk" FOREIGN KEY ("article_favorites_id") REFERENCES "public"."article_favorites"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_article_favorites_id_idx" ON "payload_locked_documents_rels" USING btree ("article_favorites_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "article_favorites" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "article_favorites" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_article_favorites_fk";
  
  DROP INDEX "payload_locked_documents_rels_article_favorites_id_idx";
  ALTER TABLE "users" DROP COLUMN "first_name";
  ALTER TABLE "users" DROP COLUMN "last_name";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "article_favorites_id";`)
}
