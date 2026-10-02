import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import UserPage from '@/shared/layouts/user/UserPage'
import ReturnToIndex from '@/shared/common/ReturnToIndex'
import ActivityHeader from '@/features/activities/components/activity-details/ActivityHeader'
import ActivityInformations from '@/features/activities/components/activity-details/ActivityInformations'
import ActivityDescription from '@/features/activities/components/activity-details/activity-description/ActivityDescription'
import ActivitySchedule from '@/features/activities/components/activity-details/ActivitySchedule'
import { getUserActivityRegistration } from '@/features/activities/server/activities'
import { getActivityFeedback } from '@/features/activities/server/feedback'
import ActivityFeedbackPanel from '@/features/activities/components/ActivityFeedbackPanel'
import { getPayloadWithUser } from '@/shared/lib/auth'
import { activityEndTime } from '@/utils/constants/activities'

const MemberActivityDetailsPage = async ({ params }: { params: Promise<{ id: string }> }) => {
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

  const { registered } = await getUserActivityRegistration(id)
  const feedback = await getActivityFeedback(activity.id)
  const ctx = await getPayloadWithUser()
  const participation = ctx
    ? await ctx.payload.find({
        collection: 'activity-registrations',
        where: {
          and: [
            { activity: { equals: activity.id } },
            { user: { equals: ctx.user.id } },
            { status: { in: ['accepted', 'completed'] } },
          ],
        },
        req: ctx.req,
        overrideAccess: false,
        limit: 1,
      })
    : null

  return (
    <UserPage title="تفاصيل النشاط">
      <div>
        <ReturnToIndex title="فهرس الأنشطة" value={activity.title} href="/user/activities" />

        <div className="mt-6 flex flex-col gap-5 lg:flex-row">
          <div className="flex flex-3 flex-col gap-5">
            <ActivityHeader
              title={activity.title}
              supervisor={activity.supervisor}
              image={activity.image}
              type={activity.type}
            />
            <ActivityInformations longDescription={activity.longDescription} />
          </div>

          <div className="flex flex-1 flex-col gap-5">
            <ActivityDescription
              activityId={String(activity.id)}
              supervisor={activity.supervisor}
              location={activity.location}
              startDate={activity.startDate}
              openForRegistration={activity.openForRegistration || false}
              isRegistered={registered}
              currentParticipants={activity.currentParticipants}
              maxParticipants={activity.maxParticipants}
            />
            <ActivitySchedule schedules={activity.schedules} />
            <ActivityFeedbackPanel
              activityId={activity.id}
              positive={feedback.positive}
              negative={feedback.negative}
              canLeaveFeedback={
                Boolean(participation?.totalDocs) && activityEndTime(activity) <= feedback.now
              }
              initialSentiment={feedback.mine?.sentiment}
              initialComment={feedback.mine?.comment ?? undefined}
            />
          </div>
        </div>
      </div>
    </UserPage>
  )
}

export default MemberActivityDetailsPage
