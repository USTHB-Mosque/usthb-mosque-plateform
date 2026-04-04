import React from 'react'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { motion } from 'motion/react'

type ArticleCardProps = {}

const ArticleCard: React.FC<ArticleCardProps> = () => {
  const [hovered, setHovered] = React.useState(false)

  return (
    <Card
      className="overflow-hidden cursor-pointer w-full"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <CardContent className="p-0">
        {/* Tall portrait image — book rectangle ratio */}
        <div className="relative h-55 overflow-hidden">
          <Badge
            variant="secondary"
            className="absolute top-3 right-3 z-10 rounded-md text-background font-dubai font-bold border border-background bg-secondary/70 text-xs"
          >
            {format(new Date(), 'dd/MM/yyyy')}
          </Badge>
          <motion.div
            className="absolute inset-0"
            animate={{ scale: hovered ? 1.08 : 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <Image
              src="/static/images/quran.png"
              alt="Article"
              fill
              className="object-cover rounded-md"
            />
          </motion.div>
        </div>

        {/* Content section */}
        <motion.div
          className="flex flex-col gap-2 p-3"
          animate={{ backgroundColor: hovered ? '#ffffff' : 'transparent' }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          style={{
            backgroundImage: hovered ? 'none' : 'url(/static/images/book-pattern.png)',
          }}
        >
          <div className="flex gap-1.5 flex-wrap">
            <Badge className="bg-primary/15 text-primary text-xs px-2 py-0">تفسير</Badge>
            <Badge className="bg-primary/15 text-primary text-xs px-2 py-0">قرآن</Badge>
          </div>
          <p className="text-base text-foreground font-bold leading-snug line-clamp-2">
            مختصر تفسير ابن كثير
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
            يُعَدّ مصلى الجامعة أكثر من مجرد مكانٍ للصلاة، فهو منارةٌ للعلم والتزكية.
          </p>
        </motion.div>
      </CardContent>

      <CardFooter className="pt-5 px-3 pb-3">
        <Button className="font-bold text-foreground w-full h-8 text-sm">سجل الآن</Button>
      </CardFooter>
    </Card>
  )
}

export default ArticleCard