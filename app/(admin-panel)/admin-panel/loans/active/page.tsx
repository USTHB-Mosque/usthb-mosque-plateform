import { redirect } from 'next/navigation'

export default async function ActiveLoansPage() {
  redirect('/admin-panel/loans')
}
