import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import Image from 'next/image'
import UserPage from '@/app/member-portal/UserPage'
import ReturnToIndex from '@/shared/common/ReturnToIndex'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { Media } from '@/payload-types'
import { getImageUrl } from '@/shared/lib/image-utils'

const MemberArticleDetailsPage = async ({
  params,
}: {
  params: Promise<{ id: string }>
}) => {
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

  const media = article.image as Media | undefined
  const imageUrl = getImageUrl(media?.url, '/static/images/quran.png')

  return (
    <UserPage title="المقال">
      <div>
        <ReturnToIndex title="فهرس المقالات" value={article.title} href="/user/articles" />

        <div className="mx-auto mt-8 flex max-w-6xl flex-col gap-8">
          <h1 className="text-center font-khalid text-3xl font-bold text-secondary md:text-4xl">
            {article.title}
          </h1>

          <Image
            src={imageUrl}
            alt={media?.alt || article.title}
            width={1200}
            height={400}
            className="h-100 w-full rounded-xl object-cover"
            sizes="(max-width: 768px) 100vw, 80vw"
          />

          <div className="prose prose-lg max-w-none text-right font-yamama leading-relaxed prose-headings:font-khalid prose-headings:text-secondary prose-strong:text-primary prose-blockquote:border-r-4 prose-blockquote:border-primary prose-blockquote:pr-4">
            {article.content ? <RichText data={article.content} /> : null}
          </div>
        </div>
      </div>
    </UserPage>
  )
}

export default MemberArticleDetailsPage