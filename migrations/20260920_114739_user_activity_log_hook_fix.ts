import { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'

// Blank migration: hooks-only change (collections/User.ts now passes `req`
// into its nested logActivity reads/writes so they join the caller's
// transaction). No schema changes, kept to satisfy the migration-guard CI job.
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {}
