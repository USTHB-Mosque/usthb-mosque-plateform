import type { Payload } from 'payload'

export interface SeedOptions {
  count?: number
  force?: boolean
  dryRun?: boolean
}

export interface SeedResult {
  collection: string
  seeded: number
  skipped: number
  failed: number
  duration: number
  error?: string
}

export const COLLECTIONS = [
  { name: 'users', count: 20, depends: [] },
  { name: 'media', count: 50, depends: [] },
  { name: 'books', count: 50, depends: ['media'] },
  { name: 'activities', count: 50, depends: ['media'] },
  { name: 'articles', count: 50, depends: ['media'] },
  { name: 'loans', count: 30, depends: ['books', 'users'] },
  { name: 'book-favorites', count: 30, depends: ['books', 'users'] },
  { name: 'activity-registrations', count: 30, depends: ['activities', 'users'] },
] as const

export type CollectionName = typeof COLLECTIONS[number]['name']

export function getSeedOrder(): CollectionName[] {
  const order: CollectionName[] = []
  const visited = new Set<string>()

  function visit(name: string) {
    if (visited.has(name)) return
    visited.add(name)
    const col = COLLECTIONS.find(c => c.name === name)
    if (!col) return
    for (const dep of col.depends) {
      visit(dep)
    }
    order.push(col.name)
  }

  for (const col of COLLECTIONS) {
    visit(col.name)
  }

  return order
}

export function validateCollectionName(name: string): name is CollectionName {
  return COLLECTIONS.some(c => c.name === name)
}

export async function withTransaction<T>(
  payload: Payload,
  fn: () => Promise<T>,
  collectionName: string,
): Promise<{ success: boolean; result?: T; error?: string }> {
  const transactionID = await payload.db.beginTransaction()

  if (!transactionID) {
    console.warn(`⚠️  Transactions not supported for "${collectionName}", seeding without them`)
    try {
      const result = await fn()
      return { success: true, result }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  try {
    const result = await fn()
    await payload.db.commitTransaction(transactionID)
    return { success: true, result }
  } catch (error) {
    await payload.db.rollbackTransaction(transactionID)
    console.error(`\n❌ Failed to seed "${collectionName}", transaction rolled back`)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
