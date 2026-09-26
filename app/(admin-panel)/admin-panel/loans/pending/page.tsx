import { redirect } from 'next/navigation'

export default async function PendingLoansPage() {
  redirect('/admin-panel/loans')
}
