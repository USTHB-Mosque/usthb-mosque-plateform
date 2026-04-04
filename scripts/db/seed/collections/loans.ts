import type { Payload } from 'payload'
import { createLoan } from '../factories/loan'
import { withTransaction, type SeedOptions, type SeedResult } from '../shared/types'

export const seedLoans = async (payload: Payload, options: SeedOptions = {}): Promise<SeedResult> => {
  const count = options.count ?? 30
  const force = options.force ?? false
  const startTime = Date.now()

  console.log(`\n📚 Start Seeding: ${count} loans...`)

  if (!force) {
    const existing = await payload.find({ collection: 'loans', limit: 1 })
    if (existing.docs.length > 0) {
      console.log('⚠️  Loans already exist. Use --force to reseed.')
      return { collection: 'loans', seeded: 0, skipped: existing.totalDocs, failed: 0, duration: 0 }
    }
  }

  if (options.dryRun) {
    console.log(`[DRY RUN] Would seed ${count} loans`)
    return { collection: 'loans', seeded: 0, skipped: 0, failed: 0, duration: 0 }
  }

  const books = await payload.find({ collection: 'books', limit: 1000 })
  const users = await payload.find({ collection: 'users', limit: 1000 })

  const bookIds = books.docs.map((book) => book.id)
  const userIds = users.docs.map((user) => user.id)

  if (bookIds.length === 0 || userIds.length === 0) {
    console.warn('⚠️  No books or users found. Skipping loan seeding.')
    return { collection: 'loans', seeded: 0, skipped: 0, failed: 0, duration: 0 }
  }

  const { success, error } = await withTransaction(
    payload,
    async () => {
      for (let i = 0; i < count; i++) {
        const loanNumber = i + 1
        const loan = await createLoan(payload, bookIds, userIds)

        if (loan) {
          console.log(`🔄 [${loanNumber}/${count}] Created loan: #${loan.id}`)
        } else {
          console.warn(`⚠️  [${loanNumber}/${count}] Loan creation returned null.`)
        }
      }
    },
    'loans',
  )

  const duration = (Date.now() - startTime) / 1000

  if (success) {
    console.log(`\n✨ Finished seeding ${count} loans in ${duration.toFixed(2)}s\n`)
    return { collection: 'loans', seeded: count, skipped: 0, failed: 0, duration }
  }

  return { collection: 'loans', seeded: 0, skipped: 0, failed: count, duration, error }
}
