import UserPage from '@/app/member-portal/UserPage'
import { Card } from '@/components/ui/card'

export default function ArticlesPage() {
  return (
    <UserPage title="المقالات" description="مقالات مفيدة من فريق المسجد">
      <Card className="p-10 text-center text-muted-foreground">هذا القسم قيد التطوير.</Card>
    </UserPage>
  )
}