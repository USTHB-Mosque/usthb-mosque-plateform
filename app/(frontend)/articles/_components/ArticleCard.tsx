import React from 'react'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'

type ArticleCardProps = {}

const ArticleCard: React.FC<ArticleCardProps> = () => {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="relative">
          <Badge
            variant="secondary"
            className="absolute top-4 right-4 rounded-md text-background font-dubai font-bold border border-background bg-secondary/70"
          >
            {format(new Date(), 'dd/MM/yyyy')}
          </Badge>

          <Image
            src="/static/images/quran.png"
            alt="Article"
            width={0}
            height={0}
            className="w-full object-cover h-50"
            sizes="100vw"
            priority
          />
        </div>
        <div
          className="flex flex-col gap-4 p-4"
          style={{
            backgroundImage: 'url(/static/images/book-pattern.png)',
          }}
        >
          <div className="flex gap-2.5">
            <Badge className="bg-primary/15 text-primary">تفسير</Badge>
            <Badge className="bg-primary/15 text-primary">قرآن</Badge>
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="text-xl text-foreground font-bold">مختصر تفسير ابن كثير</p>
            <div className="flex items-center gap-2">
              <p className="font-medium text-foreground text-base">
                يُعَدّ مصلى الجامعة أكثر من مجرد مكانٍ للصلاة، فهو منارةٌ للعلم والتزكية والتواصل
                بين طلاب الجامعة وأساتذتها.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="text-foreground w-full">سجل الآن</Button>
      </CardFooter>
    </Card>
  )
}

export default ArticleCard
