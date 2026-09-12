'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { format } from 'date-fns'
import { arDZ } from 'date-fns/locale'
import { RichText } from '@payloadcms/richtext-lexical/react'
import type { SerializedEditorState, SerializedLexicalNode } from '@payloadcms/richtext-lexical/lexical'
import { User, Calendar, Clock, Heart, Share2 } from 'lucide-react'
import { Media } from '@/payload-types'
import { getImageUrl } from '@/shared/lib/image-utils'
import { toast } from 'sonner'

interface ArticleDetailClientProps {
  title: string
  author: string
  publishDate: string | null | undefined
  image: Media | number | undefined
  content: SerializedEditorState | null | undefined
}

function calculateReadTime(content: SerializedEditorState | null | undefined): number {
  if (!content?.root?.children) return 1
  let wordCount = 0
  const countWords = (node: SerializedLexicalNode) => {
    if ('text' in node && typeof (node as { text?: string }).text === 'string') {
      wordCount += (node as { text: string }).text.split(/\s+/).filter(Boolean).length
    }
    if ('children' in node && Array.isArray(node.children)) {
      node.children.forEach(countWords)
    }
  }
  content.root.children.forEach(countWords)
  return Math.max(1, Math.ceil(wordCount / 200))
}

export default function ArticleDetailClient({
  title,
  author,
  publishDate,
  image,
  content,
}: ArticleDetailClientProps) {
  const media = image as Media | undefined
  const imageUrl = getImageUrl(media?.url, '/static/images/quran.png')
  const readTime = useMemo(() => calculateReadTime(content), [content])

  const onCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    toast.success('تم نسخ الرابط')
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-center font-khalid text-3xl font-bold text-secondary md:text-4xl">
        {title}
      </h1>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <User className="size-4 text-primary" />
            {author}
          </span>
          {publishDate && (
            <span className="flex items-center gap-1.5">
              <Calendar className="size-4 text-primary" />
              {format(new Date(publishDate), 'd MMMM yyyy', { locale: arDZ })}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Clock className="size-4 text-primary" />
            {readTime} دقائق قراءة
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex size-9 items-center justify-center rounded-lg border border-border transition-colors hover:bg-primary/10 hover:text-primary active:scale-95"
            aria-label="إعجاب"
          >
            <Heart className="size-4" />
          </button>
          <button
            type="button"
            onClick={onCopyLink}
            className="flex size-9 items-center justify-center rounded-lg border border-border transition-colors hover:bg-primary/10 hover:text-primary active:scale-95"
            aria-label="مشاركة"
          >
            <Share2 className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-8">
        <Image
          src={imageUrl}
          alt={media?.alt || title}
          width={1200}
          height={500}
          className="w-full h-auto max-h-[500px] rounded-xl object-cover"
          sizes="(max-width: 768px) 100vw, 80vw"
        />

        <div
          id="article-content"
          className="prose prose-lg max-w-none font-yamama text-right leading-relaxed mt-8
                     prose-headings:font-khalid prose-headings:text-secondary
                     prose-strong:text-primary prose-blockquote:border-r-4
                     prose-blockquote:border-primary prose-blockquote:pr-4"
        >
          {content ? (
            <RichText data={content} />
          ) : null}
        </div>
      </div>
    </div>
  )
}
