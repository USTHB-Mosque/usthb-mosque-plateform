import { redirect } from 'next/navigation'

export default async function OverdueLoansPage() {
  redirect('/admin-panel/loans')
}
