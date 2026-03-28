import Layout from '@/components/layouts'
import { getProfileDashboardData } from '@/actions/profile'
import { redirect } from 'next/navigation'
import ProfileDashboard from './_components/ProfileDashboard'

export default async function ProfilePage() {
  const data = await getProfileDashboardData()
  if (!data) redirect('/auth/login')

  return (
    <Layout>
      <ProfileDashboard data={data} />
    </Layout>
  )
}
