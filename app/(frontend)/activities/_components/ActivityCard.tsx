import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import Image from 'next/image'
import { ArrowLeft, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ActivityCardProps = {}

const ActivityCard: React.FC<ActivityCardProps> = () => {
  return (
    <Card className="">
      <CardContent className="p-0 flex">
        <Image
          src="/static/images/ramadan.png"
          alt="Activity"
          width={0}
          height={0}
          className="w-full h-75 object-cover flex-1"
          style={{
            width: '100%',
          }}
        />
        <div className="flex-2 flex flex-col justify-between p-8">
          <div>
            <div className="mb-4 flex items-center gap-2.5">
              <Calendar className="text-primary size-6" />
              <p className="text-foreground font-bold pt-1">10 فبراير 2026</p>
            </div>
            <p className="mb-3 text-foreground text-2xl font-bold">سلسلة السيرة النبوية</p>
            <p className="text-muted-foreground">
              رحلة إيمانية عميقة في تفاصيل حياة النبي صلى الله عليه وسلم، نستخلص منها الدروس والعبر
              لحياتنا المعاصرة بأسلوب شيق ومبسط يناسب جميع الأجيال.
            </p>
          </div>
          <div>
            <Button variant="link">
              <span className="text-xl font-bold pt-1">اقرأ المزيد</span>
              <ArrowLeft className="text-primary size-6" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default ActivityCard
