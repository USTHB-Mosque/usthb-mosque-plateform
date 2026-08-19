'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { arDZ } from 'date-fns/locale'
import { MapPin, Calendar, Clock, Users, Heart, MessageCircle, Share2, Bookmark } from 'lucide-react'
import { Activity, Media } from '@/payload-types'
import { getImageUrl } from '@/utils/image-utils'
import { activitiesTypesConfig } from '@/utils/constants/activities'

interface ActivityCardProps {
  activity: Activity
  className?: string
}

const ActivityCard: React.FC<ActivityCardProps> = ({ activity, className }) => {
  const router = useRouter()
  const [isLiked, setIsLiked] = useState(false)
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
    router.push(`/activities/${activity.id}`)
  }

  return (
    <article
      dir="rtl"
      className={`group/activity relative flex h-[390px] w-full items-start justify-end overflow-hidden rounded-2xl border border-solid border-stroke-grey bg-fill-white transition-all duration-300 hover:border-primary-300 hover:shadow-[0_8px_30px_rgba(10,175,146,0.15)] ${className}`}
      aria-labelledby={`activity-title-${activity.id}`}
    >
      <button
        type="button"
        onClick={handleOpen}
        className="relative flex h-full w-[45%] max-w-[500px] flex-none shrink-0 cursor-pointer self-stretch overflow-hidden border-l border-l-stroke-grey bg-cover bg-[50%_50%] sm:w-[40%]"
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
        <span className={`absolute top-[18px] right-[18px] z-10 flex h-fit w-fit items-center justify-center gap-[5.36px] rounded-lg border border-solid border-fill-white/10 px-[15px] py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.40),inset_1px_0_0_rgba(255,255,255,0.32),inset_0_-1px_4px_rgba(0,0,0,0.13),inset_-1px_0_4px_rgba(0,0,0,0.11)] backdrop-blur-[6px] ${badgeClassName}`}>
          <span className="relative flex w-fit items-center justify-center text-center font-khalid text-sm font-normal leading-[normal] text-fill-white">
            {badgeText}
          </span>
        </span>
      </button>

      <div className="relative flex flex-1 grow flex-col items-end justify-between self-stretch px-6 py-5 pt-6 pb-7 md:px-8">
        <div className="relative flex w-full flex-none flex-col items-start gap-4 self-stretch">
          <section
            className="relative flex w-full flex-col items-start gap-3 self-stretch"
            aria-label="معلومات النشاط"
          >
            <div className="flex flex-wrap items-start justify-end gap-2 self-stretch" aria-label="تصنيفات النشاط">
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
            <p className="relative flex w-full items-start justify-end self-stretch font-alyamama text-sm leading-[20.3px] text-blue-300 line-clamp-2">
              {activity.shortDescription}
            </p>
            <dl className="grid h-fit grid-cols-2 grid-flow-row gap-[10px_16px] p-3 rounded-[10px] border border-solid border-stroke-grey bg-fill-contrast">
              {details.map((detail) => {
                const Icon = detail.icon
                return (
                  <div
                    key={detail.label}
                    className="flex h-full w-full items-center justify-end gap-1.5"
                  >
                    <dt className="sr-only">{detail.label}</dt>
                    <dd className="flex w-fit items-center justify-end whitespace-nowrap font-alyamama text-xs leading-3 text-blue-300">
                      {detail.text}
                    </dd>
                    <Icon className="h-5 w-5 flex-none text-blue-200" aria-hidden="true" />
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
              className="inline-flex items-center gap-1.5 cursor-pointer"
              aria-label={isLiked ? 'إزالة الإعجاب' : 'الإعجاب بالنشاط'}
              aria-pressed={isLiked}
              onClick={() => setIsLiked((current) => !current)}
            >
              <Heart
                className={`h-[18px] w-[18px] transition-colors ${isLiked ? 'text-danger fill-danger' : 'text-blue-200'}`}
                aria-hidden="true"
              />
              <span className="font-alyamama text-xs leading-3 text-blue-300">{isLiked ? 195 : 194}</span>
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 cursor-pointer"
              aria-label="عرض التعليقات"
              onClick={handleOpen}
            >
              <MessageCircle className="h-[18px] w-[18px] text-blue-200" aria-hidden="true" />
              <span className="font-alyamama text-xs leading-3 text-blue-300">13</span>
            </button>
          </div>
          <div className="inline-flex items-center gap-5">
            <button
              type="button"
              className="cursor-pointer"
              aria-label={isShared ? 'تمت مشاركة النشاط' : 'مشاركة النشاط'}
              onClick={handleShare}
            >
              <Share2 className={`h-[18px] w-[18px] ${isShared ? 'text-primary-300' : 'text-blue-200'}`} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="cursor-pointer"
              aria-label={isBookmarked ? 'إزالة النشاط من المحفوظات' : 'حفظ النشاط'}
              aria-pressed={isBookmarked}
              onClick={() => setIsBookmarked((current) => !current)}
            >
              <Bookmark
                className={`h-[18px] w-[18px] ${isBookmarked ? 'text-primary-300 fill-primary-300' : 'text-blue-200'}`}
                aria-hidden="true"
              />
            </button>
          </div>
        </footer>
      </div>
    </article>
  )
}

export default ActivityCard