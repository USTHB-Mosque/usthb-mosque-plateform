import { Construction } from 'lucide-react'
import UserPage from '../UserPage'

export default function MemberDashboardPage() {
  return (
    <UserPage title="لوحة التحكم">
      <section className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-tabs-active bg-card px-6 py-20 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-primary-200/40">
          <Construction className="size-8 text-primary-300" aria-hidden />
        </div>
        <h2 className="text-xl font-bold text-[#243245] dark:text-card-foreground">لوحة التحكم</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          هذه الصفحة قيد التطوير، سيتم إضافة ملخص أنشطتك وإعاراتك وتسجيلاتك هنا قريباً.
        </p>
      </section>
    </UserPage>
  )
}