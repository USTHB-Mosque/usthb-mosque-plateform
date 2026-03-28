import Layout from '@/components/layouts'
import { ChevronLeft } from 'lucide-react'
import Image from 'next/image'
import config from '@/payload.config'
import { getPayload } from 'payload'
import { notFound } from 'next/navigation'

import { Media } from '@/payload-types'
import { RichText } from '@payloadcms/richtext-lexical/react'

const BookDetailsPage = async ({
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
  console.log(article.content)
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex gap-3 items-center">
          <span className="text-2xl">فهرس المقالات</span>
          <ChevronLeft className="w-4 h-4" />
          <span className="text-primary text-2xl font-bold">{article.title}</span>
        </div>
        <div className="flex flex-col gap-10 max-w-6xl mx-auto">
          <p className="text-center text-4xl text-secondary font-bold">{article.title}</p>

          <Image
            src={media?.url || ''}
            alt={media?.alt || 'Article'}
            width={0}
            height={0}
            className="w-full object-cover h-100 rounded-xl"
            sizes="100vw"
            priority
          />
          <div
            className="prose prose-lg max-w-none font-yamama text-right leading-relaxed 
                prose-headings:font-khalid prose-headings:text-secondary 
                prose-strong:text-primary prose-blockquote:border-r-4 
                prose-blockquote:border-primary prose-blockquote:pr-4"
          >
            {article.content ? <RichText data={article.content} /> : null}
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default BookDetailsPage
