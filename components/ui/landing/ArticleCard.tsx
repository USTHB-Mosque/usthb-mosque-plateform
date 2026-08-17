'use client'

import React from 'react'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import { Article, Media } from '@/payload-types'
import { getImageUrl } from '@/utils/image-utils'

type LandingArticleCardProps = {
  article?: Article
}

const LandingArticleCard: React.FC<LandingArticleCardProps> = ({ article }) => {
  const [hovered, setHovered] = React.useState(false)
  const router = useRouter()

  const media = article?.image as Media | undefined
  const imageUrl = getImageUrl(media?.url, '/static/images/quran.png')
  const publishDate = article?.publishDate ?? new Date().toISOString()
  const tags = article?.tags?.map((tag) => tag.name) ?? ['تفسير', 'قرآن']
  const title = article?.title ?? 'مختصر تفسير ابن كثير'
  const description =
    article?.description ?? 'يُعَدّ مصلى الجامعة أكثر من مجرد مكانٍ للصلاة، فهو منارةٌ للعلم والتزكية.'

  return (
    <Card
      className="overflow-hidden cursor-pointer w-full"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <CardContent className="p-0">
        <div className="relative h-55 overflow-hidden">
          <Badge
            variant="secondary"
            className="absolute top-3 right-3 z-10 rounded-md text-background font-dubai font-bold border border-background bg-secondary/70 text-xs"
          >
            {format(new Date(publishDate), 'dd/MM/yyyy')}
          </Badge>
          <motion.div
            className="absolute inset-0"
            animate={{ scale: hovered ? 1.08 : 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <Image
              src={imageUrl}
              alt={media?.alt || 'Article'}
              fill
              className="object-cover rounded-md"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </motion.div>
        </div>

        <motion.div
          className="flex flex-col gap-2 p-3"
          animate={{ backgroundColor: hovered ? '#ffffff' : 'rgba(255, 255, 255, 0)' }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          style={{
            backgroundImage: hovered ? 'none' : 'url(/static/images/book-pattern.png)',
          }}
        >
          <div className="flex gap-1.5 flex-wrap">
            {tags.slice(0, 2).map((tag) => (
              <Badge key={tag} className="bg-primary/15 text-primary text-xs px-2 py-0">
                {tag}
              </Badge>
            ))}
          </div>
          <p className="text-base text-foreground font-bold leading-snug line-clamp-2">{title}</p>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{description}</p>
        </motion.div>
      </CardContent>

      <CardFooter className="pt-5 px-3 pb-3">
        <Button
          className="font-bold text-foreground w-full h-8 text-sm"
          onClick={() => {
            if (article) {
              router.push(`/articles/${article.id}`)
            }
          }}
        >
          سجل الآن
        </Button>
      </CardFooter>
    </Card>
  )
}

export default LandingArticleCard