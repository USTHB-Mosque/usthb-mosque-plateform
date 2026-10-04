/**
 * Promote an existing user to admin role.
 *
 * Usage:
 *   pnpm tsx scripts/promote-admin.ts --list                  # list all users with roles
 *   pnpm tsx scripts/promote-admin.ts user@example.com        # promote user to admin
 */

import { getPayload } from 'payload'
import config from '../payload.config'

async function main() {
  const arg = process.argv[2]
  const payload = await getPayload({ config })

  if (arg === '--list') {
    const result = await payload.find({
      collection: 'users',
      limit: 50,
      overrideAccess: true,
      select: { email: true, role: true, fullName: true, firstName: true, lastName: true },
    })

    console.log(`\n  Found ${result.totalDocs} user(s):\n`)
    for (const u of result.docs) {
      const name = u.fullName || [u.firstName, u.lastName].filter(Boolean).join(' ') || '—'
      console.log(`  [${u.role || 'user'}] ${u.email} (${name})`)
    }
    console.log()
    process.exit(0)
  }

  if (!arg || arg.startsWith('-')) {
    console.error('Usage: pnpm tsx scripts/promote-admin.ts <email>')
    console.error('       pnpm tsx scripts/promote-admin.ts --list')
    process.exit(1)
  }

  const email = arg

  const result = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
    overrideAccess: true,
  })

  if (result.docs.length === 0) {
    console.error(`User not found: ${email}`)
    process.exit(1)
  }

  const user = result.docs[0]

  if (user.role === 'admin') {
    console.log(`${email} is already an admin.`)
    process.exit(0)
  }

  await payload.update({
    collection: 'users',
    id: user.id,
    data: { role: 'admin' },
    overrideAccess: true,
  })

  console.log(`✅ Promoted ${email} to admin.`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
