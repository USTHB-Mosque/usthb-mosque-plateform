import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getAdminBook } from '@/features/admin/server/books'
import BookDetail from '@/components/admin-views/library/BookDetail'
import AdminPage from '@/shared/layouts/admin/AdminPage'

export default async function AdminBookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let book
  try {
    book = await getAdminBook(id)
  } catch {
    notFound()
  }

  if (!book) notFound()

  const payload = await getPayload({ config })
  const similarBooksResult = await payload.find({
    collection: 'books',
    where: {
      and: [{ type: { in: book.type } }, { id: { not_equals: book.id } }],
    },
    limit: 4,
    sort: '-publishDate',
  })

  return (
    <AdminPage title={`المكتبة / ${book.title}`}>
      <BookDetail book={book} similarBooks={similarBooksResult.docs} />
    </AdminPage>
  )
}
