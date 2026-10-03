import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import UserPage from '@/shared/layouts/user/UserPage'
import { Media } from '@/payload-types'
import ArticleDetailClient from '@/features/articles/components/ArticleDetailClient'

const MemberArticleDetailsPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params

  const payload = await getPayload({ config })

  const result = await payload.find({
    collection: 'articles',
    where: {
      id: { equals: id },
    },
  })
  const article = result.docs[0]
  if (!article) return notFound()

  return (
    <UserPage title="المقال">
      <div>
        {/* #164: no breadcrumb — phone users swipe back. */}
        <div className="mt-8">
          <ArticleDetailClient
            title={article.title}
            author={article.author}
            publishDate={article.publishDate}
            image={article.image}
            content={article.content}
          />
        </div>
      </div>
    </UserPage>
  )
}

export default MemberArticleDetailsPage
