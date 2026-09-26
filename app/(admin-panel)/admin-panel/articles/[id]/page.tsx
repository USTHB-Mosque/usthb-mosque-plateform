import { notFound } from 'next/navigation'
import { getAdminArticle } from '@/features/admin'
import AdminArticleDetail from '@/components/admin-views/articles/AdminArticleDetail'
import AdminPage from '@/shared/layouts/admin/AdminPage'

export default async function AdminArticleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let article
  try {
    article = await getAdminArticle(id)
  } catch {
    notFound()
  }

  if (!article) notFound()

  return (
    <AdminPage title={`المقالات / ${article.title}`}>
      <AdminArticleDetail article={article} />
    </AdminPage>
  )
}
