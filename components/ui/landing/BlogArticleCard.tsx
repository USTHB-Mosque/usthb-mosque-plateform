'use client'

import React from 'react'
import Image from 'next/image'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Article, Media } from '@/payload-types'
import { getImageUrl } from '@/utils/image-utils'
import LandingCtaButton from './LandingCtaButton'

interface BlogArticleCardProps {
  article?: Article
  className?: string
}

const defaultTags = ['مقال', 'المسجد']

const BlogArticleCard: React.FC<BlogArticleCardProps> = ({ article, className }) => {
  const router = useRouter()

  const media = article?.image as Media | undefined
  const imageUrl = getImageUrl(media?.url, '/static/images/quran.png')
  const publishDate = article?.publishDate ?? new Date().toISOString()
  const tags = article?.tags?.filter((tag) => tag.name) ?? defaultTags.map((name) => ({ name, id: name }))
  const title = article?.title ?? 'منارة العلم والإيمان في حياة الجامعة'
  const description =
    article?.description ??
    'يُعَدّ مصلى الجامعة أكثر من مجرد مكانٍ للصلاة، فهو منارةٌ للعلم والتزكية والتواصل بين طلاب الجامعة وأساتذتها.'

  const handleReadArticle = (): void => {
    if (article) {
      router.push(`/articles/${article.id}`)
    }
  }

  return (
    <article
      dir="rtl"
      className={cn(
        'group/card relative flex h-full flex-col items-center gap-5 overflow-hidden rounded-xl border border-solid border-stroke-grey bg-fill-white px-0 pt-0 pb-4 transition-all duration-300 hover:-translate-y-1 hover:border-primary-300 hover:shadow-[0_8px_30px_rgba(10,175,146,0.15)]',
        className,
      )}
    >
      <header className="relative flex h-[200px] w-full items-start justify-start gap-2.5 self-stretch overflow-hidden rounded-xl p-4">
        <Image
          src={imageUrl}
          alt={media?.alt || title}
          fill
          className="object-cover transition-transform duration-500 group-hover/card:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <time
          dateTime={publishDate}
          className="relative inline-flex h-8 flex-none items-center justify-center gap-2.5 rounded-lg border border-solid border-[color:var(--color-fill-main)] bg-[#2a3a4cb2] px-4 py-1 backdrop-blur-[2px]"
        >
          <span className="relative mt-[-2.50px] mb-[-0.50px] flex w-fit items-center justify-center text-center font-dubai text-base font-bold leading-[normal] tracking-[0.16px] text-fill-white">
            {format(new Date(publishDate), 'dd/MM/yyyy')}
          </span>
        </time>
      </header>

      <div
        className="relative flex w-full flex-1 flex-col items-start gap-6 self-stretch px-4 py-0"
        style={{
          backgroundImage: 'url(/static/images/book-pattern.png)',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <section
          className="relative flex w-full flex-1 flex-col items-start gap-2 self-stretch"
          aria-label="معلومات المقال"
        >
          <div className="relative flex w-full flex-none items-center justify-start gap-2.5 self-stretch px-4 py-0">
            {tags.slice(0, 2).map((tag, index) => (
              <span
                key={tag.id ?? index}
                className="relative inline-flex h-7 flex-none items-center justify-center gap-2.5 rounded-lg bg-primary-main-15 px-3 py-1"
              >
                <span className="relative flex w-fit items-center justify-center whitespace-nowrap text-center font-alyamama text-sm font-normal leading-[14px] tracking-[0.14px] text-primary-300">
                  {tag.name}
                </span>
              </span>
            ))}
          </div>
          <div className="relative flex w-full flex-none flex-col items-start gap-2 self-stretch">
            <div className="relative flex w-full flex-none items-center justify-center gap-2.5 self-stretch px-4 py-0">
              <h2 className="relative mt-[-1.00px] flex flex-1 items-center justify-start font-khalid text-xl font-normal leading-[normal] tracking-[0.20px] text-blue-400 line-clamp-1">
                {title}
              </h2>
            </div>
            <div className="relative flex w-full flex-none items-center justify-center gap-2.5 self-stretch px-4 py-0">
              <p className="relative mt-[-1.00px] flex flex-1 items-center justify-start font-alyamama text-base font-normal leading-[normal] tracking-[0.16px] text-blue-300 line-clamp-3">
                {description}
              </p>
            </div>
          </div>
        </section>

        <footer className="relative flex w-full flex-none flex-col items-start gap-6 self-stretch">
          <div
            className="h-px w-full self-stretch rounded-[5px] bg-stroke-grey"
            aria-hidden="true"
          />
          <LandingCtaButton
            label="مطالعة المقال"
            onClick={handleReadArticle}
            ariaLabel={`مطالعة المقال: ${title}`}
          />
        </footer>
      </div>
    </article>
  )
}

export default BlogArticleCard