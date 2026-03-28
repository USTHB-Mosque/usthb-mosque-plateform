import Layout from '@/components/layouts'
import { ChevronLeft } from 'lucide-react'
import React from 'react'
import ActivityDetails from '../_components/activity-details/ActivityDetails'
import ActivitySchedule from '../_components/activity-details/ActivitySchedule'
import ActivityHeader from '../_components/activity-details/ActivityHeader'
import ActivityInformations from '../_components/activity-details/ActivityInformations'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { notFound } from 'next/navigation'

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
        <div className="flex gap-3 items-center">
          <span className="text-2xl">فهرس المقالات</span>
          <ChevronLeft className="w-4 h-4" />
          <span className="text-primary text-2xl font-bold">{article.title}</span>
        </div>

        <div className="flex gap-8">
          <div className="flex-1 flex-col gap-8">
            <ActivityDetails />
            <ActivitySchedule />
          </div>

          <div className="flex-1 flex-col gap-8">
            <ActivityHeader />
            <ActivityInformations />
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default ActivityDetailsPage
