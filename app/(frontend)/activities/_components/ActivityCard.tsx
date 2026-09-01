'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { arDZ } from 'date-fns/locale'
import { MapPin, Calendar, Clock, Users, Share2, Bookmark, ArrowLeft } from 'lucide-react'
import { Activity, Media } from '@/payload-types'
import { getImageUrl } from '@/utils/image-utils'
import { activitiesTypesConfig } from '@/utils/constants/activities'
import { Button } from '@/components/ui/button'

interface ActivityCardProps {
  activity: Activity
  className?: string
  href?: string
}

const ActivityCard: React.FC<ActivityCardProps> = ({ activity, className, href }) => {
  const router = useRouter()
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isShared, setIsShared] = useState(false)

  const media = activity.image as Media | undefined
  const imageUrl = getImageUrl(media?.url)
  const typeLabel = activitiesTypesConfig[activity.type] ?? 'نشاط'
  const audience = activity.targetAudience?.map((a) => a.name).filter(Boolean).join(' • ') || 'الجميع'
  const scheduleCount = activity.schedules?.length ?? 0
  const startLabel = activity.startDate
    ? format(new Date(activity.startDate), 'dd/MM/yyyy', { locale: arDZ })
    : 'غير محدد'

  const open = activity.openForRegistration === true
  const badgeText = open ? 'قائم' : 'مكتمل'
  const badgeClassName = open
    ? 'bg-success-50'
    : 'bg-[#24324580]'

  const details = [
    { icon: MapPin, text: activity.location || 'في مسجد الجامعة', label: 'الموقع' },
    { icon: Calendar, text: `ابتداء من ${startLabel}`, label: 'تاريخ البداية' },
    { icon: Clock, text: scheduleCount > 0 ? `${scheduleCount} لقاءات` : 'لقاءات متعددة', label: 'المدة' },
    { icon: Users, text: audience, label: 'الفئة' },
  ]

  const handleShare = async (): Promise<void> => {
    const shareData = {
      title: activity.title,
      text: activity.shortDescription,
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${shareData.title} - ${shareData.text}`)
      }
      setIsShared(true)
      window.setTimeout(() => setIsShared(false), 2000)
    } catch {
      setIsShared(false)
    }
  }

  const handleOpen = (): void => {
    router.push(href ?? `/activities/${activity.id}`)
  }

  return (
    <article
      dir="rtl"
      className={`group/activity relative flex h-[390px] w-full items-start justify-start overflow-hidden rounded-2xl border border-solid border-stroke-grey bg-fill-main transition-all duration-300 hover:border-primary-300 hover:shadow-[0_8px_30px_rgba(10,175,146,0.15)] ${className}`}
      aria-labelledby={`activity-title-${activity.id}`}
    >
      <button
        type="button"
        onClick={handleOpen}
        className="relative flex h-full w-[45%] max-w-[500px] flex-none shrink-0 cursor-pointer self-stretch overflow-hidden border-e border-e-stroke-grey bg-cover bg-[50%_50%] sm:w-[40%]"
        role="img"
        aria-label={`صورة نشاط ${activity.title}`}
      >
        {imageUrl && (
          <Image
            src={imageUrl}
            alt={media?.alt || activity.title}
            fill
            className="object-cover transition-transform duration-500 group-hover/activity:scale-105"
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 40vw, 500px"
          />
        )}
        <span className={`absolute top-[18px] end-[18px] z-10 flex h-fit w-fit items-center justify-center gap-[5.36px] rounded-lg border border-solid border-fill-white/10 px-[15px] py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.40),inset_1px_0_0_rgba(255,255,255,0.32),inset_0_-1px_4px_rgba(0,0,0,0.13),inset_-1px_0_4px_rgba(0,0,0,0.11)] backdrop-blur-[6px] ${badgeClassName}`}>
          <span className="relative flex w-fit items-center justify-center text-center font-khalid text-sm font-normal leading-[normal] text-fill-white">
            {badgeText}
          </span>
        </span>
      </button>

      <div className="relative flex flex-1 grow flex-col items-start justify-between self-stretch px-6 py-5 pt-6 pb-7 md:px-8">
        <div className="relative flex w-full flex-none flex-col items-start gap-4 self-stretch">
          <section
            className="relative flex w-full flex-col items-start gap-3 self-stretch"
            aria-label="معلومات النشاط"
          >
            <div className="flex flex-wrap items-start justify-start gap-2 self-stretch" aria-label="تصنيفات النشاط">
              <span className="relative inline-flex h-7 flex-none items-center justify-center gap-2.5 rounded-lg bg-primary-main-15 px-3 py-1">
                <span className="relative flex w-fit items-center justify-center whitespace-nowrap text-center font-alyamama text-sm font-normal leading-[14px] tracking-[0.14px] text-primary-300">
                  {typeLabel}
                </span>
              </span>
            </div>
            <h2
              id={`activity-title-${activity.id}`}
              className="relative w-fit max-w-full items-center self-start text-2xl leading-[26.4px] font-khalid text-blue-400 line-clamp-1"
            >
              {activity.title}
            </h2>
            <p className="relative flex w-full items-start justify-start self-stretch font-alyamama text-sm leading-[20.3px] text-blue-300 line-clamp-2">
              {activity.shortDescription}
            </p>
            <dl className="grid h-fit w-full grid-cols-2 grid-flow-row gap-[10px_16px] p-3 rounded-[10px] border border-solid border-stroke-grey bg-fill-contrast">
              {details.map((detail) => {
                const Icon = detail.icon
                return (
                  <div
                    key={detail.label}
                    className="flex h-full w-full min-w-0 items-center justify-start gap-1.5"
                  >
                    <dt className="sr-only">{detail.label}</dt>
                    <Icon className="h-5 w-5 flex-none text-blue-200" aria-hidden="true" />
                    <dd className="flex flex-1 min-w-0 items-center justify-start overflow-hidden whitespace-nowrap text-ellipsis font-alyamama text-xs leading-3 text-blue-300">
                      {detail.text}
                    </dd>
                  </div>
                )
              })}
            </dl>
          </section>
        </div>

        <footer className="relative flex w-full flex-none items-center justify-between self-stretch px-2 py-0">
          <div className="inline-flex items-center gap-5">
            <button
              type="button"
              className="cursor-pointer"
              aria-label={isBookmarked ? 'إزالة النشاط من المحفوظات' : 'حفظ النشاط'}
              aria-pressed={isBookmarked}
              onClick={() => setIsBookmarked((current) => !current)}
            >
              <Bookmark
                className={`h-[18px] w-[18px] transition-colors hover:text-primary-300 ${isBookmarked ? 'text-primary-300 fill-primary-300' : 'text-blue-200'}`}
                aria-hidden="true"
              />
            </button>
            <button
              type="button"
              className="cursor-pointer"
              aria-label={isShared ? 'تمت مشاركة النشاط' : 'مشاركة النشاط'}
              onClick={handleShare}
            >
              <Share2 className={`h-[18px] w-[18px] transition-colors hover:text-primary-300 ${isShared ? 'text-primary-300' : 'text-blue-200'}`} aria-hidden="true" />
            </button>
          </div>
          <Button
            variant="ghost"
            className="cursor-pointer gap-1.5 font-alyamama text-sm text-primary-300 hover:bg-transparent hover:text-primary px-2"
            aria-label={`عرض تفاصيل النشاط: ${activity.title}`}
            onClick={handleOpen}
          >
            التفاصيل
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
        </footer>
      </div>
    </article>
  )
}

export default ActivityCard