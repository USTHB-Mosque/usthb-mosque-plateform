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
    collection: 'articles',
    where: {
      id: { equals: id[0] },
    },
  })
  const article = result.docs[0]
  if (!article) return notFound()

  return (
    <Layout>
      <div className="space-y-6">
        <ReturnToIndex title="فهرس الأنشطة" value={article.title} href="/activities" />

        <div className="flex gap-8">
          <div className="flex-7 flex flex-col gap-8">
            <ActivityHeader />
            <ActivityInformations />
          </div>

          <div className="flex-3 flex flex-col gap-8">
            <ActivityDescription />
            <ActivitySchedule />
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default ActivityDetailsPage
