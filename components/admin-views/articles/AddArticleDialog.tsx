'use client'

import React, { useState, useTransition, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { createArticle, updateArticle } from '@/features/admin'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Loader2, X, ImageIcon, Pencil, Plus } from 'lucide-react'
import { articleTypesConfigArray } from '@/utils/constants/articles'
import type { Article, Media } from '@/payload-types'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import { getImageUrl } from '@/shared/lib/image-utils'
import { articlesKeys } from '@/features/articles/api/articles.queries'
import { compressImage } from '@/utils/image-compress'
import { lexicalToPlainText, plainTextToLexical } from '@/utils/rich-text'

interface AddArticleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  article?: Article | null
}

const EMPTY_FORM = {
  title: '',
  type: '',
  author: '',
  publishDate: '',
  description: '',
  content: '',
}

function articleToForm(article?: Article | null) {
  if (!article) return EMPTY_FORM
  return {
    title: article.title ?? '',
    type: article.type ?? '',
    author: article.author ?? '',
    publishDate: article.publishDate ? article.publishDate.slice(0, 10) : '',
    description: article.description ?? '',
    content: lexicalToPlainText(article.content as SerializedEditorState | null | undefined),
  }
}

const AddArticleDialog: React.FC<AddArticleDialogProps> = ({ open, onOpenChange, article }) => {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState(() => articleToForm(article))
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [clearImage, setClearImage] = useState(false)
  const [tags, setTags] = useState<string[]>(() => (article?.tags ?? []).map((t) => t.name ?? ''))

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار ملف صورة')
      return
    }

    setImageFile(file)
    setClearImage(false)
    const reader = new FileReader()
    reader.onload = (ev) => {
      setImagePreview(ev.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeCover = () => {
    removeImage()
    setClearImage(true)
  }

  const addTag = () => {
    setTags((prev) => [...prev, ''])
  }

  const updateTag = (index: number, value: string) => {
    setTags((prev) => prev.map((tag, i) => (i === index ? value : tag)))
  }

  const removeTag = (index: number) => {
    setTags((prev) => prev.filter((_, i) => i !== index))
  }

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setTags([])
    removeImage()
    setClearImage(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.title.trim() || !form.type || !form.author.trim() || !form.description.trim()) {
      toast.error('يرجى ملء جميع الحقول المطلوبة')
      return
    }

    if (!article && !imageFile) {
      toast.error('يرجى اختيار صورة للمقال')
      return
    }

    if (article && clearImage && !imageFile) {
      toast.error('يرجى اختيار صورة جديدة للمقال بعد إزالة الصورة الحالية')
      return
    }

    startTransition(async () => {
      try {
        const fd = new FormData()
        fd.set('title', form.title.trim())
        fd.set('type', form.type)
        fd.set('author', form.author.trim())
        fd.set('description', form.description.trim())
        if (form.publishDate) fd.set('publishDate', form.publishDate)
        fd.set('content', JSON.stringify(plainTextToLexical(form.content)))
        fd.set(
          'tags',
          JSON.stringify(tags.map((name) => ({ name })).filter((t) => t.name.trim() !== '')),
        )
        if (imageFile) {
          const compressed = await compressImage(imageFile)
          fd.set('image', compressed)
        }

        const result = article ? await updateArticle(article.id, fd) : await createArticle(fd)

        if (result.ok) {
          toast.success(article ? 'تم حفظ التعديلات' : 'تم نشر المقال بنجاح')
          onOpenChange(false)
          if (!article) resetForm()
          queryClient.invalidateQueries({ queryKey: articlesKeys.root })
          router.refresh()
        }
      } catch {
        toast.error(article ? 'حدث خطأ أثناء حفظ التعديلات' : 'حدث خطأ أثناء نشر المقال')
      }
    })
  }

  const existingImageRaw = (article?.image as Media | undefined)?.url
  const existingImageUrl = existingImageRaw ? getImageUrl(existingImageRaw) : null
  const displayImageUrl = imagePreview ?? (clearImage ? null : existingImageUrl)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl" showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle className="font-alyamama text-lg">
            {article ? 'تعديل المقال' : 'إضافة مقال جديد'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="max-h-[70vh] space-y-6 overflow-y-auto pe-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[240px_1fr]">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
              {displayImageUrl ? (
                <div className="relative min-h-[200px] overflow-hidden rounded-xl border border-border">
                  <img
                    src={displayImageUrl}
                    alt="معاينة"
                    className="absolute inset-0 size-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-black/55 py-2 text-xs font-medium text-white transition-colors hover:bg-black/70"
                  >
                    <Pencil className="size-3.5" />
                    تغيير الصورة
                  </button>
                  {imageFile ? (
                    <button
                      type="button"
                      onClick={removeImage}
                      aria-label="إلغاء اختيار الصورة الجديدة"
                      className="absolute top-1.5 end-1.5 flex size-6 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
                    >
                      <X className="size-3.5" />
                    </button>
                  ) : article ? (
                    <button
                      type="button"
                      onClick={removeCover}
                      aria-label="إزالة صورة المقال"
                      className="absolute top-1.5 end-1.5 flex size-6 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
                    >
                      <X className="size-3.5" />
                    </button>
                  ) : null}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-background-2 p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  <ImageIcon className="size-8 text-muted-foreground" />
                  <span className="text-center text-xs text-muted-foreground">صورة المقال *</span>
                </button>
              )}

              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label>العنوان *</Label>
                    <Input
                      value={form.title}
                      onChange={(e) => update('title', e.target.value)}
                      placeholder="عنوان المقال"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>الكاتب *</Label>
                    <Input
                      value={form.author}
                      onChange={(e) => update('author', e.target.value)}
                      placeholder="اسم الكاتب"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label>النوع *</Label>
                    <Select value={form.type} onValueChange={(v) => v && update('type', v)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="اختر النوع" />
                      </SelectTrigger>
                      <SelectContent>
                        {articleTypesConfigArray.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>تاريخ النشر</Label>
                    <Input
                      type="date"
                      value={form.publishDate}
                      onChange={(e) => update('publishDate', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>الوصف المختصر *</Label>
              <Textarea
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                placeholder="وصف مختصر للمقال (200 حرف كحد أقصى)"
                className="min-h-16"
                maxLength={200}
                required
              />
              <span className="text-start text-xs text-muted-foreground">
                {form.description.length} / 200
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>محتوى المقال</Label>
              <Textarea
                value={form.content}
                onChange={(e) => update('content', e.target.value)}
                placeholder="اكتب محتوى المقال هنا..."
                dir="rtl"
                className="min-h-48"
              />
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-sm font-medium text-muted-foreground">الوسوم</span>
              {tags.map((tag, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={tag}
                    onChange={(e) => updateTag(index, e.target.value)}
                    placeholder="اسم الوسم"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-lg"
                    onClick={() => removeTag(index)}
                    aria-label="حذف الوسم"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" className="gap-2" onClick={addTag}>
                <Plus className="size-4" />
                إضافة وسم
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              {article ? 'حفظ التعديلات' : 'نشر المقال'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default AddArticleDialog
