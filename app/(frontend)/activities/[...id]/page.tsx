import Layout from '@/shared/layouts'
import ActivityDescription from '@/features/activities/components/activity-details/activity-description/ActivityDescription'
import ActivitySchedule from '@/features/activities/components/activity-details/ActivitySchedule'
import ActivityHeader from '@/features/activities/components/activity-details/ActivityHeader'
import ActivityInformations from '@/features/activities/components/activity-details/ActivityInformations'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { notFound } from 'next/navigation'
import ReturnToIndex from '@/shared/common/ReturnToIndex'

const ActivityDetailsPage = async ({
  params,
}: {
  params: Promise<{
    id: string[]
  }>
}) => {
  const { id } = await params
  const payload = await getPayload({ config })

  const result = await payload.find({
    collection: 'activities',
    where: {
      id: { equals: id[0] },
    },
  })

  const activity = result.docs[0]

  if (!activity) {
    notFound()
  }
  return (
    // #164: pb below lg so the fixed registration bar never covers the footer
    <div className="max-lg:pb-24">
      <Layout>
        <div className="space-y-6">
          <ReturnToIndex title="فهرس الأنشطة" value={activity.title} href="/activities" />

          {/* #164: the two columns stack on phones like the member portal
            does — a fixed side-by-side squeezed the header image to a
            180px strip on a 390px screen. */}
          <div className="flex flex-col gap-5 lg:flex-row lg:gap-8">
            <div className="flex-3 flex flex-col gap-8">
              <ActivityHeader
                title={activity.title}
                supervisor={activity.supervisor}
                image={activity.image}
                type={activity.type}
              />
              <ActivityInformations longDescription={activity.longDescription} />
            </div>

            <div className="flex-1 flex flex-col gap-8">
              <ActivityDescription
                activityId={String(activity.id)}
                supervisor={activity.supervisor}
                location={activity.location}
                startDate={activity.startDate}
                openForRegistration={activity.openForRegistration || false}
                currentParticipants={activity.currentParticipants}
                maxParticipants={activity.maxParticipants}
              />
              <ActivitySchedule schedules={activity.schedules} />
            </div>
          </div>
        </div>
      </Layout>
    </div>
  )
}

export default ActivityDetailsPage
