import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { createFirstAdmin } from '@/features/admin/server/first-admin-core'

/**
 * Bootstrap step: creates the first admin user on a database that has no
 * users yet. Credentials come from ADMIN_EMAIL / ADMIN_PASSWORD env vars.
 *
 * Runs in the Vercel build pipeline (see vercel.json) and can be invoked
 * manually with `pnpm bootstrap:admin`. Idempotent: once users exist it is
 * a no-op. Missing credentials fail the build on purpose — a silently
 * skipped bootstrap would look like a working platform with no way in.
 *
 * Usage: pnpm bootstrap:admin
 */
async function main() {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD

  if (!email || !password) {
    console.error('❌ ADMIN_EMAIL و ADMIN_PASSWORD مطلوبان في متغيرات البيئة')
    process.exit(1)
  }

  const payload = await getPayload({ config })
  const outcome = await createFirstAdmin(payload, email, password)

  switch (outcome.kind) {
    case 'created':
      console.log(`✅ تم إنشاء حساب المسؤول الأول: ${email}`)
      break
    case 'users-exist':
      console.log('ℹ️  يوجد مستخدمون في قاعدة البيانات بالفعل — لم يتم إنشاء أي حساب')
      break
    case 'error':
      console.error(`❌ ${outcome.message}`)
      process.exit(1)
  }

  // Payload keeps the Postgres pool open; exit explicitly so build steps end.
  process.exit(0)
}

main().catch((error) => {
  console.error('❌ فشل إنشاء المسؤول الأول:', error instanceof Error ? error.message : error)
  process.exit(1)
})
