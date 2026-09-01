import UserPage from '@/app/member-portal/UserPage'
import { Card } from '@/components/ui/card'

export default function LatestUpdatesPage() {
  return (
    <UserPage title="آخر التحديثات" description="آخر أخبار ومستجدات المسجد">
      <Card className="p-10 text-center text-muted-foreground">هذا القسم قيد التطوير.</Card>
    </UserPage>
  )
}