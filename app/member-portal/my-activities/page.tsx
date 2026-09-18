import { redirect } from 'next/navigation'

export default async function DashboardMyActivitiesPage() {
  redirect('/user/my-registrations')
}