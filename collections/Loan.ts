import { CollectionConfig } from 'payload'

export const Loan: CollectionConfig = {
  slug: 'loans',
  admin: { useAsTitle: 'id' },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return { user: { equals: user.id } }
    },
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return { user: { equals: user.id } }
    },
    delete: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return { user: { equals: user.id } }
    },
  },
  fields: [
    { name: 'book', type: 'relationship', relationTo: 'books', required: true },
    { name: 'user', type: 'relationship', relationTo: 'users', required: true },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pending',
      options: [
        { label: 'En attente', value: 'pending' },
        { label: 'Approuvé', value: 'approved' },
        { label: 'Retourné', value: 'returned' },
        { label: 'En retard', value: 'overdue' },
      ],
    },
    { name: 'loanDate', type: 'date', required: true, defaultValue: () => new Date() },
    { name: 'dueDate', type: 'date', required: true },
    { name: 'returnDate', type: 'date' },
  ],
}
