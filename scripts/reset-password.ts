import { getPayload } from 'payload'
import config from '../payload.config'

async function main() {
  const email = process.argv[2]
  const password = process.argv[3]

  if (!email || !password) {
    console.error('Usage: pnpm tsx scripts/reset-password.ts <email> <password>')
    process.exit(1)
  }

  const payload = await getPayload({ config })

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

  await payload.update({
    collection: 'users',
    id: result.docs[0].id,
    data: { password },
    overrideAccess: true,
  })

  console.log(`Password reset for ${email}`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
