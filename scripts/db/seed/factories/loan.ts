import type { Payload } from 'payload'
import { fakerAR as faker } from '@faker-js/faker'

const statuses = ['pending', 'approved', 'returned', 'overdue'] as const

export const createLoan = async (payload: Payload, bookIds: number[], userIds: number[]) => {
  const status = faker.helpers.arrayElement(statuses)

  const loanDate = faker.date.past({ years: 1 })
  const dueDate = faker.date.future({ refDate: loanDate })
  const returnDate =
    status === 'returned' ? faker.date.between({ from: loanDate, to: dueDate }) : null

  return await payload.create({
    collection: 'loans',
    data: {
      book: faker.helpers.arrayElement(bookIds),
      user: faker.helpers.arrayElement(userIds),
      status,
      loanDate: new Date(loanDate).toISOString().split('T')[0],
      dueDate: new Date(dueDate).toISOString().split('T')[0],
      returnDate: returnDate ? new Date(returnDate).toISOString().split('T')[0] : null,
    },
  })
}
