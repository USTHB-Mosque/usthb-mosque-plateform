import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { COLLECTIONS } from './seed/shared'

async function main() {
  const payload = await getPayload({ config })

  console.log('📊 Collection Counts\n')
  console.log('Collection                  Count')
  console.log('─────────────────────────────────────')

  let total = 0
  for (const col of COLLECTIONS) {
    const { totalDocs } = await payload.find({ collection: col.name, limit: 0 })
    total += totalDocs
    const paddedName = col.name.padEnd(28)
    console.log(`${paddedName} ${totalDocs}`)
  }

  console.log('─────────────────────────────────────')
  console.log(`Total: ${total}`)
}

main()
