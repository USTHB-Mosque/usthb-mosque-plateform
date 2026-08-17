'use client'

import React from 'react'
import Image from 'next/image'
import { BookOpen } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Book, Media } from '@/payload-types'
import { getImageUrl } from '@/utils/image-utils'
import LandingCtaButton from './LandingCtaButton'

type LandingBookCardProps = {
  book?: Book
  className?: string
  imageClassName?: string
}

const defaultTags = ['قرآن', 'تفسير']

const LandingBookCard: React.FC<LandingBookCardProps> = ({ book, className, imageClassName }) => {
  const router = useRouter()

  const media = book?.image as Media | undefined
  const imageUrl = getImageUrl(media?.url, '/static/images/quran.png')
  const title = book?.title ?? 'مختصر تفسير ابن كثير'
  const author = book?.author ?? 'محمد بن جرير الطبري'
  const tags = book?.tags?.map((tag) => tag.name).filter(Boolean) ?? defaultTags
  const isAvailable = !book || (book.availableBooks ? book.availableBooks > 0 : true)

  const handleRegister = (): void => {
    router.push(`/library/book/${book?.id ?? 1}`)
  }

  return (
    <article
      dir="rtl"
      className={cn(
        'group/card relative flex h-full w-full flex-col items-center overflow-hidden rounded-xl border border-solid border-stroke-grey bg-fill-white transition-all duration-300 hover:-translate-y-1 hover:border-primary-300 hover:shadow-[0_8px_30px_rgba(10,175,146,0.15)]',
        className,
      )}
    >
      <header className="relative flex h-48 w-full flex-none self-stretch overflow-hidden rounded-xl bg-cover bg-[50%_50%]">
        <Image
          src={imageUrl}
          alt={media?.alt || title}
          fill
          className={cn('object-cover transition-transform duration-500 group-hover/card:scale-105', imageClassName)}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
        {isAvailable && (
          <div className="absolute top-4 right-4 z-10 flex h-fit w-fit items-center justify-center gap-[5.36px] rounded-lg border border-solid border-fill-white/10 bg-success-50 px-[15px] py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.40),inset_1px_0_0_rgba(255,255,255,0.32),inset_0_-1px_4px_rgba(0,0,0,0.13),inset_-1px_0_4px_rgba(0,0,0,0.11)] backdrop-blur-[6px]">
            <span className="relative flex w-fit items-center justify-center text-center font-alyamama text-sm font-normal leading-[normal] text-fill-white">
              متوفر
            </span>
          </div>
        )}
      </header>

      <div
        className="relative flex w-full flex-1 flex-col items-start gap-4 self-stretch p-4"
        style={{
          backgroundImage: 'url(/static/images/book-pattern.png)',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div
          className="relative flex w-full flex-none items-center justify-start gap-2.5 self-stretch"
          aria-label="تصنيفات الكتاب"
        >
          {tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="relative inline-flex h-7 flex-none items-center justify-center gap-2.5 rounded-lg bg-primary-main-15 px-3 py-1"
            >
              <span className="relative flex w-fit items-center justify-center whitespace-nowrap text-center font-alyamama text-sm font-normal leading-[14px] tracking-[0.14px] text-primary-300">
                {tag}
              </span>
            </span>
          ))}
        </div>

        <div className="relative flex w-full flex-none flex-col items-start gap-0.5 self-stretch">
          <h2 className="relative mt-[-1.00px] flex w-fit items-center justify-center font-alyamama text-base font-bold leading-[normal] tracking-[0.16px] text-blue-400 line-clamp-1">
            {title}
          </h2>
          <div className="relative flex w-full flex-none items-center justify-start gap-2 self-stretch">
            <BookOpen className="relative h-4 w-4 flex-none text-blue-200" aria-hidden="true" />
            <span className="relative flex flex-1 items-center justify-start whitespace-nowrap font-alyamama text-sm leading-[normal] tracking-[0.14px] text-blue-200 line-clamp-1">
              {author}
            </span>
          </div>
        </div>

        <div className="relative flex w-full flex-none flex-col items-start gap-4 self-stretch">
          <div className="h-px w-full self-stretch rounded-[5px] bg-stroke-grey" aria-hidden="true" />
          <LandingCtaButton
            label="سجل الآن"
            onClick={handleRegister}
            ariaLabel={`سجل الآن في ${title}`}
          />
        </div>
      </div>
    </article>
  )
}

export default LandingBookCard
