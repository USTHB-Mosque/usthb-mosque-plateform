import type { Payload } from 'payload'

export const COLLECTIONS = [
  { name: 'users', seed: 'seedUsers', count: 20, depends: [] },
  { name: 'media', seed: 'seedMedias', count: 50, depends: [] },
  { name: 'books', seed: 'seedBooks', count: 50, depends: ['media'] },
  { name: 'activities', seed: 'seedActivities', count: 50, depends: ['media'] },
  { name: 'articles', seed: 'seedArticles', count: 50, depends: ['media'] },
  { name: 'loans', seed: 'seedLoans', count: 30, depends: ['books', 'users'] },
  { name: 'book-favorites', seed: 'seedBookFavorites', count: 30, depends: ['books', 'users'] },
  { name: 'activity-registrations', seed: 'seedActivityRegistrations', count: 30, depends: ['activities', 'users'] },
] as const

export type CollectionName = typeof COLLECTIONS[number]['name']

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

export function getCollectionConfig(name: CollectionName) {
  return COLLECTIONS.find(c => c.name === name)
}

export function validateCollectionName(name: string): name is CollectionName {
  return COLLECTIONS.some(c => c.name === name)
}
