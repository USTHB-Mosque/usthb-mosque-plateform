import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import UserPage from '@/app/member-portal/UserPage'
import ReturnToIndex from '@/components/common/ReturnToIndex'
import ActivityHeader from '@/app/(frontend)/activities/_components/activity-details/ActivityHeader'
import ActivityInformations from '@/app/(frontend)/activities/_components/activity-details/ActivityInformations'
import ActivityDescription from '@/app/(frontend)/activities/_components/activity-details/activity-description/ActivityDescription'
import ActivitySchedule from '@/app/(frontend)/activities/_components/activity-details/ActivitySchedule'

const MemberActivityDetailsPage = async ({
  params,
}: {
  params: Promise<{ id: string }>
}) => {
  const { id } = await params

  const payload = await getPayload({ config })

  const result = await payload.find({
    collection: 'activities',
    where: {
      id: { equals: id },
    },
  })
  const activity = result.docs[0]
  if (!activity) return notFound()

  return (
    <UserPage title="تفاصيل النشاط">
      <div>
        <ReturnToIndex title="فهرس الأنشطة" value={activity.title} href="/user/activities" />

        <div className="mt-6 flex flex-col gap-8 lg:flex-row">
          <div className="flex flex-3 flex-col gap-8">
            <ActivityHeader
              title={activity.title}
              supervisor={activity.supervisor}
              image={activity.image}
              type={activity.type}
            />
            <ActivityInformations
              longDescription={activity.longDescription}
              benefits={activity.benefits}
            />
          </div>

          <div className="flex flex-1 flex-col gap-8">
            <ActivityDescription
              activityId={String(activity.id)}
              supervisor={activity.supervisor}
              location={activity.location}
              startDate={activity.startDate}
              openForRegistration={activity.openForRegistration || false}
            />
            <ActivitySchedule schedules={activity.schedules} />
          </div>
        </div>
      </div>
    </UserPage>
  )
}

export default MemberActivityDetailsPage