'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Separator } from '@/shared/ui/separator'
import { Calendar, CheckCircle2, MapPin, User } from 'lucide-react'
import ActivityDescriptionLine from './ActivityDescriptionLine'
import LandingCtaButton from '@/shared/ui/LandingCtaButton'
import { Activity } from '@/payload-types'
import { format } from 'date-fns'
import { arDZ } from 'date-fns/locale'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { registerActivity } from '@/features/activities/server/activities'
import { useGetProfileQuery } from '@/features/auth'
import { toast } from 'sonner'

interface ActivityDescriptionProps {
  activityId: string
  supervisor: Activity['supervisor']
  location: Activity['location']
  startDate: Activity['startDate']
  openForRegistration: boolean
  isRegistered?: boolean
}

const ActivityDescription: React.FC<ActivityDescriptionProps> = ({
  activityId,
  supervisor,
  location,
  startDate,
  openForRegistration,
  isRegistered = false,
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

  const getButtonLabel = () => {
    if (isRegistered) return 'مسجّل بالفعل'
    if (!openForRegistration) return 'التسجيل مغلق'
    return 'سجل الآن'
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
          {isRegistered ? (
            <div className="flex items-center gap-2 rounded-lg border border-[#0DE9C3]/30 bg-[#0DE9C3]/10 px-4 py-3">
              <CheckCircle2 className="size-5 text-[#0DE9C3]" />
              <span className="font-alyamama text-sm font-medium text-[#0AAFC2]">
                أنت مسجّل في هذا النشاط
              </span>
            </div>
          ) : (
            <LandingCtaButton
              label={getButtonLabel()}
              onClick={handleRegister}
              disabled={!openForRegistration}
              loading={isRegistering}
              ariaLabel={getButtonLabel()}
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default ActivityDescription