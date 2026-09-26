import { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'

// No-op migration. The accompanying change (reset-link origin derivation in
// collections/User.ts generateEmailHTML) is configuration only and has no
// database footprint; this file exists to satisfy the migration guard.
//
// NOTE: `payload migrate:create` for this change diffed against a drifted
// local database and emitted a duplicate `ALTER TYPE ... ADD VALUE
// 'first_admin_created'` (the value already exists in the migrations chain —
// see 20260922_092238_add_first_admin_created_action). Re-running it would
// fail in production with a duplicate-value error, so the generated SQL was
// discarded. Run `pnpm payload:migrate` locally to clear the drift.
export async function up(_args: MigrateUpArgs): Promise<void> {}

export async function down(_args: MigrateDownArgs): Promise<void> {}
