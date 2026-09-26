import { getPayload } from 'payload'
import config from '@/payload.config'
import { fakerAR as faker } from '@faker-js/faker'

import { LOAN_STATUSES } from '@/utils/constants/loans'

export const createLoan = async (bookIds: number[], userIds: number[]) => {
  const payload = await getPayload({ config })

  const status = faker.helpers.arrayElement(LOAN_STATUSES)

  const loanDate = faker.date.past({ years: 1 })
  const dueDate = faker.date.future({ refDate: loanDate })
  const returnDate =
    status === 'returned' ? faker.date.between({ from: loanDate, to: dueDate }) : null

  const loan = await payload.create({
    collection: 'loans',
    data: {
      book: faker.helpers.arrayElement(bookIds),
      user: faker.helpers.arrayElement(userIds),
      status,
      loanDate: new Date(loanDate).toISOString().split('T')[0],
      // Accepted and picked-up loans hold a reserved copy and carry a pickup
      // code; picked-up loans additionally carry a (sometimes past) due date.
      ...(status === 'accepted' || status === 'picked_up'
        ? {
            pickupCode: `${faker.number.int({ min: 1, max: 9 })}/${faker.string.alphanumeric(3)}/${String(loanDate.getFullYear()).slice(-2)}`,
            pickupDate: new Date(loanDate).toISOString().split('T')[0],
            pickupHour: `${String(faker.number.int({ min: 9, max: 16 })).padStart(2, '0')}:00`,
            ...(status === 'picked_up'
              ? { dueDate: new Date(dueDate).toISOString().split('T')[0] }
              : {}),
          }
        : {}),
      ...(status === 'refused' ? { refusalReason: faker.lorem.sentence() } : {}),
      ...(returnDate ? { returnDate: new Date(returnDate).toISOString().split('T')[0] } : {}),
    },
  })

  return loan
}

export const seedLoans = async (n: number = 10) => {
  console.log(`\n📚 Start Seeding: ${n} loans...`)
  const startTime = Date.now()

  const payload = await getPayload({ config })

  const books = await payload.find({
    collection: 'books',
    limit: 1000,
  })

  const users = await payload.find({
    collection: 'users',
    limit: 1000,
  })

  const bookIds = books.docs.map((book) => book.id)
  const userIds = users.docs.map((user) => user.id)

  if (bookIds.length === 0 || userIds.length === 0) {
    console.warn('⚠️  No books or users found. Skipping loan seeding.')
    return
  }

  for (let i = 0; i < n; i++) {
    const loanNumber = i + 1

    try {
      const loan = await createLoan(bookIds, userIds)

      if (loan) {
        console.log(`🔄 [${loanNumber}/${n}] Created loan: #${loan.id}`)
      } else {
        console.warn(`⚠️  [${loanNumber}/${n}] Loan creation returned null.`)
      }
    } catch (error) {
      console.error(
        `❌ [${loanNumber}/${n}] Error creating loan:`,
        error instanceof Error ? error.message : error,
      )
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2)
  console.log(`\n✨ Finished seeding ${n} loans in ${duration}s\n`)
}
