import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "books_type" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_books_type",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  ALTER TABLE "books_type" ADD CONSTRAINT "books_type_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "books_type_order_idx" ON "books_type" USING btree ("order");
  CREATE INDEX "books_type_parent_idx" ON "books_type" USING btree ("parent_id");
  INSERT INTO "books_type" ("order", "parent_id", "value")
  SELECT 0, "id", "type" FROM "books" WHERE "type" IS NOT NULL;
  ALTER TABLE "books" DROP COLUMN "type";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "books" ADD COLUMN "type" "enum_books_type";
   UPDATE "books" SET "type" = (
     SELECT "value" FROM "books_type"
     WHERE "books_type"."parent_id" = "books"."id"
     ORDER BY "order" ASC
     LIMIT 1
   );
   ALTER TABLE "books" ALTER COLUMN "type" SET NOT NULL;
   DROP TABLE "books_type" CASCADE;`)
}
