import Layout from '@/shared/layouts'
import config from '@/payload.config'
import { getPayload } from 'payload'
import { notFound } from 'next/navigation'

import { Media } from '@/payload-types'
import ReturnToIndex from '@/shared/common/ReturnToIndex'
import ArticleDetailClient from '@/features/articles/components/ArticleDetailClient'

const ArticleDetailsPage = async ({
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

  const media = article.image as Media

  return (
    <Layout>
      <div className="space-y-6">
        <ReturnToIndex title="فهرس المقالات" value={article.title} href="/articles" />
        <ArticleDetailClient
          title={article.title}
          author={article.author}
          publishDate={article.publishDate}
          image={article.image}
          content={article.content}
        />
      </div>
    </Layout>
  )
}

export default ArticleDetailsPage
