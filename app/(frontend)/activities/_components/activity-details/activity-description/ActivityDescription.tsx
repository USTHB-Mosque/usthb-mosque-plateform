'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Calendar, MapPin, User } from 'lucide-react'
import ActivityDescriptionLine from './ActivityDescriptionLine'
import LandingCtaButton from '@/components/ui/landing/LandingCtaButton'
import { Activity } from '@/payload-types'
import { format } from 'date-fns'
import { arDZ } from 'date-fns/locale'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { registerActivity } from '@/actions/activities'
import { useGetProfileQuery } from '@/lib/apis/auth-api'
import { toast } from 'sonner'

interface ActivityDescriptionProps {
  activityId: string
  supervisor: Activity['supervisor']
  location: Activity['location']
  startDate: Activity['startDate']
  openForRegistration: boolean
}

const ActivityDescription: React.FC<ActivityDescriptionProps> = ({
  activityId,
  supervisor,
  location,
  startDate,
  openForRegistration,
}) => {
  const router = useRouter()
  const [isRegistering, setIsRegistering] = useState(false)
  const { data: { user } = { user: undefined } } = useGetProfileQuery()

  const handleRegister = async () => {
    if (!user) {
      router.push('/auth/login?redirect=/activities/' + activityId)
      return
    }

    if (!openForRegistration) {
      toast.error('عذراً، التسجيل مغلق لهذا النشاط')
      return
    }

    setIsRegistering(true)
    const result = await registerActivity(activityId)
    setIsRegistering(false)

    if (result.success) {
      toast.success(result.message)
      router.push('/user/my-registrations')
    } else {
      toast.error(result.message)
    }
  }

  return (
    <Card className="p-6 space-y-6">
      <CardHeader>
        <CardTitle className="text-secondary text-2xl font-bold">التفاصيل</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 p-0">
        <div className="space-y-8">
          <ActivityDescriptionLine
            icon={<User />}
            title="المشرف"
            description={`تحت إشراف ${supervisor}`}
          />
          <ActivityDescriptionLine icon={<MapPin />} title="الموقع" description={location || ''} />
          <ActivityDescriptionLine
            icon={<Calendar />}
            title="تاريخ البدء"
            description={
              startDate
                ? format(new Date(startDate), 'EEEE d MMMM yyyy', {
                    locale: arDZ,
                  })
                : 'تاريخ غير محدد'
            }
          />
        </div>
        <Separator />
        <div>
          <LandingCtaButton
            label={openForRegistration ? 'سجل الآن' : 'التسجيل مغلق'}
            onClick={handleRegister}
            disabled={!openForRegistration}
            loading={isRegistering}
            ariaLabel={openForRegistration ? 'سجّل في هذا النشاط' : 'التسجيل مغلق'}
          />
        </div>
      </CardContent>
    </Card>
  )
}

export default ActivityDescription