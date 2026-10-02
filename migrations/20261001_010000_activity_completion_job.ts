import { sql, type MigrateUpArgs, type MigrateDownArgs } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(
    sql`ALTER TYPE "enum_payload_jobs_task_slug" ADD VALUE 'completeActivityRegistrations';`,
  )
  await db.execute(
    sql`ALTER TYPE "enum_payload_jobs_log_task_slug" ADD VALUE 'completeActivityRegistrations';`,
  )
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // Keep enum values: queued jobs and logs may still reference the task.
}
