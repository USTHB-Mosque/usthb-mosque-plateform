import AdminPage from '@/shared/layouts/admin/AdminPage'

export default async function ActivitiesPage() {
  return (
    <AdminPage title="الأنشطة">
      <div className="flex flex-col gap-6">
        <p className="text-sm text-muted-foreground">قريباً...</p>
      </div>
    </AdminPage>
  )
}
