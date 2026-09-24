'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui/dialog'
import type { Book } from '@/payload-types'
import ReturnToIndex from '@/shared/common/ReturnToIndex'
import BookPreview from '@/features/library/components/book-details/BookPreview'
import BookAvailability from '@/features/library/components/book-details/BookAvailability'
import BookBasicInformations from '@/features/library/components/book-details/BookBasicInformations'
import BookDetailedInformations from '@/features/library/components/book-details/book-detailed-informations/BookDetailedInformations'
import { softDeleteBook } from '@/features/admin/server/books'
import AddBookDialog from './AddBookDialog'
import { toast } from 'sonner'

interface BookDetailProps {
  book: Book
  similarBooks?: Book[]
}

const BookDetail: React.FC<BookDetailProps> = ({ book, similarBooks = [] }) => {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const isAvailable = (book.availableBooks ?? 0) > 0

  const handleDelete = () => {
    startTransition(async () => {
      const result = await softDeleteBook(book.id)
      if (result.ok) {
        toast.success('تم حذف الكتاب')
        router.push('/admin-panel/library')
        router.refresh()
      }
    })
  }

  return (
    <div>
      <ReturnToIndex title="فهرس الكتب" value={book.title} href="/admin-panel/library" />

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="flex flex-col gap-5 lg:col-span-4 xl:col-span-3">
          <BookPreview
            image={book.image}
            averageRating={book.averageRating}
            ratingCount={book.ratingCount}
            isAvailable={isAvailable}
            bookId={book.id}
            initialFavorited={false}
            bookTitle={book.title}
            adminMode
            adminActions={
              <>
                <Button className="h-12 flex-1" variant="outline" onClick={() => setEditOpen(true)}>
                  <Pencil className="me-1 size-4" />
                  تعديل
                </Button>
                <Button
                  className="h-12 flex-1"
                  variant="destructive"
                  onClick={() => setDeleteOpen(true)}
                  disabled={pending}
                >
                  {pending ? (
                    <Loader2 className="me-1 size-4 animate-spin" />
                  ) : (
                    <Trash2 className="me-1 size-4" />
                  )}
                  حذف
                </Button>
              </>
            }
          />
          <BookAvailability
            totalBooks={book.totalBooks}
            availableBooks={book.availableBooks}
            location={book.location}
          />
        </div>

        <div className="flex flex-col gap-5 lg:col-span-8 xl:col-span-9">
          <BookBasicInformations
            title={book.title}
            author={book.author}
            shortDescription={book.shortDescription}
            tags={book.tags}
          />
          <BookDetailedInformations book={book} similarBooks={similarBooks} />
        </div>
      </div>

      {/* Edit dialog */}
      <AddBookDialog
        key={`edit-${book.id}`}
        book={book}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      {/* Delete confirm */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle className="font-alyamama text-lg">حذف الكتاب</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            سيتم حذف «{book.title}» من المكتبة مع الاحتفاظ بسجل الإعارات والتقييمات المرتبطة به.
            يمكنك التراجع لاحقاً عبر إعادة تفعيل الكتاب.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={pending}>
              إلغاء
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={pending}>
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              تأكيد الحذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default BookDetail
