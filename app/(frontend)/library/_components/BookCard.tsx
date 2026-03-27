import React from 'react'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

type BookCardProps = {}

const BookCard: React.FC<BookCardProps> = () => {
  const router = useRouter()
  return (
    <Card>
      <CardContent className="p-0">
        <div className="relative">
          <Badge
            className="absolute top-4 right-4 px-4 py-2 rounded-lg 
             bg-[#00FF9180] backdrop-blur-md 
             border border-background/20 shadow-lg
             font-bold
             before:content-[''] before:absolute before:inset-0 before:rounded-lg 
             before:bg-linear-to-br before:from-background/20 before:to-transparent"
          >
            متوفر
          </Badge>
          <Image
            src="/static/images/quran.png"
            alt="Book"
            width={0}
            height={0}
            className="w-full h-98 object-cover rounded-b-xl"
            style={{
              width: '100%',
            }}
          />
        </div>
        <div
          className="flex flex-col gap-4 p-4"
          style={{
            backgroundImage: 'url(/static/images/book-pattern.png)',
          }}
        >
          <div className="flex gap-2.5">
            <Badge className="bg-primary/15 text-primary text-base">تفسير</Badge>
            <Badge className="bg-primary/15 text-primary text-base">قرآن</Badge>
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="text-sm">مختصر تفسير ابن كثير</p>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">محمد بن جرير الطبري</p>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          className="text-foreground w-full"
          onClick={() => {
            router.push(`/library/book/${1}`)
          }}
        >
          سجل الآن
        </Button>
      </CardFooter>
    </Card>
  )
}

export default BookCard
