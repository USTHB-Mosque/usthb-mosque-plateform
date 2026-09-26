'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import ReturnToIndex from '@/shared/common/ReturnToIndex'
import ArticleDetailClient from '@/features/articles/components/ArticleDetailClient'
import AddArticleDialog from './AddArticleDialog'
import { deleteArticle } from '@/features/admin'
import { articlesKeys } from '@/features/articles/api/articles.queries'
import type { Article } from '@/payload-types'

interface AdminArticleDetailProps {
  article: Article
}

const AdminArticleDetail: React.FC<AdminArticleDetailProps> = ({ article }) => {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmPending, setConfirmPending] = useState(false)

  const runDelete = async () => {
    setConfirmPending(true)
    try {
      const result = await deleteArticle(article.id)
      if (result.ok) {
        toast.success('تم حذف المقال')
        queryClient.invalidateQueries({ queryKey: articlesKeys.root })
        router.push('/admin-panel/articles')
      } else {
        toast.error(result.error)
      }
      setConfirmOpen(false)
    } finally {
      setConfirmPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <ReturnToIndex title="فهرس المقالات" value={article.title} href="/admin-panel/articles" />

      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="outline" className="gap-2" onClick={() => setEditOpen(true)}>
          <Pencil className="size-4" />
          تعديل
        </Button>
        <Button
          type="button"
          variant="destructive"
          className="gap-2"
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2 className="size-4" />
          حذف
        </Button>
      </div>

      <ArticleDetailClient
        title={article.title}
        author={article.author}
        publishDate={article.publishDate}
        image={article.image}
        content={article.content}
        wide
      />

      <AddArticleDialog
        key={`edit-${article.id}`}
        article={article}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <Dialog open={confirmOpen} onOpenChange={(open) => !open && setConfirmOpen(false)}>
        <DialogContent className="sm:max-w-md" showCloseButton={!confirmPending}>
          <DialogHeader>
            <DialogTitle className="font-alyamama text-lg">حذف المقال</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            سيتم حذف «{article.title}» نهائياً. لا يمكن التراجع عن هذا الإجراء.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={confirmPending}
            >
              إلغاء
            </Button>
            <Button variant="destructive" onClick={runDelete} disabled={confirmPending}>
              {confirmPending ? (
                <span className="me-1 size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Trash2 className="me-1 size-4" />
              )}
              تأكيد الحذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AdminArticleDetail
