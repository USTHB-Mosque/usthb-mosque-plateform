import Layout from '@/shared/layouts'
import config from '@/payload.config'
import { getPayload } from 'payload'
import { notFound } from 'next/navigation'

import { Media } from '@/payload-types'
import ReturnToIndex from '@/shared/common/ReturnToIndex'
import ArticleDetailClient from '@/features/articles/components/ArticleDetailClient'
import { recordArticleRead } from '@/features/articles/server/article-reads'
import { getAuthenticatedUser } from '@/shared/lib/auth'

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

  // #156: the admin analytics screen reports article reads, and the only honest
  // source for them is this render. `getAuthenticatedUser` answers members only
  // (admins excluded), and `recordArticleRead` is a no-op without a member and
  // swallows its own failures, so neither can cost the reader their page.
  const reader = await getAuthenticatedUser()
  await recordArticleRead(payload, article.id, reader)

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
