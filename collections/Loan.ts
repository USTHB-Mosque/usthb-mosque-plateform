import { CollectionConfig } from 'payload'

export const Loan: CollectionConfig = {
  slug: 'loans',
  admin: { useAsTitle: 'id' },
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
