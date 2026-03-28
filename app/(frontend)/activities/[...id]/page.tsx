import Layout from '@/components/layouts'
import ActivityDescription from '../_components/activity-details/activity-description/ActivityDescription'
import ActivitySchedule from '../_components/activity-details/ActivitySchedule'
import ActivityHeader from '../_components/activity-details/ActivityHeader'
import ActivityInformations from '../_components/activity-details/ActivityInformations'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { notFound } from 'next/navigation'
import ReturnToIndex from '@/components/common/ReturnToIndex'

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
    <Layout>
      <div className="space-y-6">
        <ReturnToIndex title="فهرس الأنشطة" value={activity.title} href="/activities" />

        <div className="flex gap-8">
          <div className="flex-3 flex flex-col gap-8">
            <ActivityHeader
              title={activity.title}
              supervisor={activity.supervisor}
              image={activity.image}
              type={activity.type}
            />
            <ActivityInformations />
          </div>

          <div className="flex-1 flex flex-col gap-8">
            <ActivityDescription
              supervisor={activity.supervisor}
              location={activity.location}
              startDate={activity.startDate}
            />
            <ActivitySchedule schedules={activity.schedules} />
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default ActivityDetailsPage
