import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { format } from 'date-fns'
import { arDZ } from 'date-fns/locale'
import type { Activity, ActivityRegistration, Media } from '@/payload-types'
import { getImageUrl } from '@/utils/image-utils'
import RegistrationStatusBadge from '../../my-registrations/_components/RegistrationStatusBadge'

interface RegistrationsPreviewProps {
  registrations: ActivityRegistration[]
}

const RegistrationsPreview: React.FC<RegistrationsPreviewProps> = ({ registrations }) => {
  return (
    <section className="rounded-2xl border border-border bg-card">
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-card-foreground">تسجيلاتي القادمة</h2>
        <Link href="/user/my-registrations" className="text-xs text-primary-300 hover:underline">
          عرض الكل
        </Link>
      </header>

      {registrations.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">
          لا توجد تسجيلات قادمة.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {registrations.slice(0, 3).map((registration) => {
            const activity = registration.activity as Activity | undefined
            const cover = activity?.image as Media | undefined
            const start = activity?.startDate ? new Date(activity.startDate) : null

            return (
              <li key={registration.id}>
                <Link
                  href={`/user/activities/${activity?.id ?? ''}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                >
                  <Image
                    src={getImageUrl(cover?.url, '/static/images/quran.png')}
                    alt={activity?.title || 'صورة النشاط'}
                    width={40}
                    height={40}
                    className="size-10 shrink-0 rounded-md border border-border object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-card-foreground">
                      {activity?.title || 'نشاط'}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {activity?.location || '—'}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <RegistrationStatusBadge registration={registration} />
                    <span className="text-xs text-muted-foreground">
                      {start ? format(start, 'd MMM yyyy', { locale: arDZ }) : 'غير محدد'}
                    </span>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default RegistrationsPreview