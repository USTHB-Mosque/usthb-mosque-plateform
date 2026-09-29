import { sql, type MigrateUpArgs, type MigrateDownArgs } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "notifications" ADD COLUMN "event_key" varchar;`)
  await db.execute(
    sql`CREATE UNIQUE INDEX "notifications_event_key_idx" ON "notifications" ("event_key");`,
  )
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP INDEX "notifications_event_key_idx";`)
  await db.execute(sql`ALTER TABLE "notifications" DROP COLUMN "event_key";`)
}
