import { getAdminCardsStats } from '@/features/admin/server/cards'
import Cards from '@/features/admin/components/views/cards/Cards'
import AdminPage from '@/shared/layouts/admin/AdminPage'

export default async function CardsPage() {
  const stats = await getAdminCardsStats()

  return (
    <AdminPage title="البطاقات">
      <Cards stats={stats} />
    </AdminPage>
  )
}
