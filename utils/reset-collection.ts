import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { COLLECTIONS, CollectionName, validateCollectionName } from './seed-config'

async function resetCollection(name: CollectionName) {
  const payload = await getPayload({ config })

  console.log(`🗑️  Resetting "${name}" collection...`)

  const { totalDocs } = await payload.find({ collection: name, limit: 0 })

  if (totalDocs === 0) {
    console.log('✅ Collection is already empty.')
    return
  }

  await payload.delete({
    collection: name,
    where: { id: { exists: true } },
    overrideAccess: true,
  })

  console.log(`✅ Deleted ${totalDocs} documents from "${name}"`)
}

const collectionName = process.argv[2]

if (!collectionName) {
  console.error('❌ Please provide a collection name')
  console.log(`Usage: tsx utils/reset-collection.ts <collection>`)
  console.log(`Valid: ${COLLECTIONS.map(c => c.name).join(', ')}`)
  process.exit(1)
}

if (!validateCollectionName(collectionName)) {
  console.error(`❌ Invalid collection: ${collectionName}`)
  console.log(`Valid: ${COLLECTIONS.map(c => c.name).join(', ')}`)
  process.exit(1)
}

resetCollection(collectionName)
