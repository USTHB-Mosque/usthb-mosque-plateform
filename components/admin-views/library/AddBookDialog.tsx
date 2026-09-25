'use client'

import React, { useState, useTransition, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { createBook, updateBook } from '@/features/admin/server/books'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Loader2, X, ImageIcon, Check, Pencil } from 'lucide-react'
import { bookTypesConfigArray, bookCategoriesConfigArray } from '@/utils/constants/books'
import { languagesConfigArray } from '@/utils/constants/data'
import type { Book, Media } from '@/payload-types'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import { getImageUrl } from '@/shared/lib/image-utils'
import { booksKeys } from '@/features/library/api/books.queries'
import { cn } from '@/shared/lib/utils'
import { compressImage } from '@/utils/image-compress'
import { lexicalToPlainText, plainTextToLexical } from '@/utils/rich-text'

interface AddBookDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  book?: Book | null
}

const EMPTY_FORM = {
  title: '',
  author: '',
  type: [] as string[],
  category: 'religious',
  shortDescription: '',
  longDescription: '',
  publisher: '',
  language: '',
  pageCount: '',
  isbn: '',
  editionNumber: '',
  publishDate: '',
  totalBooks: '',
  availableBooks: '',
  location: '',
}

function bookToForm(book?: Book | null) {
  if (!book) return EMPTY_FORM
  return {
    title: book.title ?? '',
    author: book.author ?? '',
    type: book.type ?? [],
    category: book.category ?? 'religious',
    shortDescription: book.shortDescription ?? '',
    longDescription: lexicalToPlainText(book.longDescription as SerializedEditorState | null),
    publisher: book.publisher ?? '',
    language: book.language ?? '',
    pageCount: book.pageCount != null ? String(book.pageCount) : '',
    isbn: book.isbn ?? '',
    editionNumber: book.editionNumber ?? '',
    publishDate: book.publishDate ? book.publishDate.slice(0, 10) : '',
    totalBooks: book.totalBooks != null ? String(book.totalBooks) : '',
    availableBooks: book.availableBooks != null ? String(book.availableBooks) : '',
    location: book.location ?? '',
  }
}

const AddBookDialog: React.FC<AddBookDialogProps> = ({ open, onOpenChange, book }) => {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState(() => bookToForm(book))

  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [clearCover, setClearCover] = useState(false)

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const toggleType = (value: string) => {
    setForm((prev) => ({
      ...prev,
      type: prev.type.includes(value)
        ? prev.type.filter((t) => t !== value)
        : [...prev.type, value],
    }))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار ملف صورة')
      return
    }

    setImageFile(file)
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
    setClearCover(true)
  }

  const resetForm = () => {
    setForm(EMPTY_FORM)
    removeImage()
    setClearCover(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (
      !form.title.trim() ||
      !form.author.trim() ||
      form.type.length === 0 ||
      !form.shortDescription.trim()
    ) {
      toast.error('يرجى ملء جميع الحقول المطلوبة')
      return
    }

    startTransition(async () => {
      try {
        const fd = new FormData()
        fd.set('title', form.title.trim())
        fd.set('author', form.author.trim())
        for (const t of form.type) fd.append('type', t)
        fd.set('category', form.category)
        fd.set('shortDescription', form.shortDescription.trim())
        if (form.publisher.trim()) fd.set('publisher', form.publisher.trim())
        if (form.language) fd.set('language', form.language)
        if (form.pageCount) fd.set('pageCount', form.pageCount)
        if (form.isbn.trim()) fd.set('isbn', form.isbn.trim())
        if (form.editionNumber.trim()) fd.set('editionNumber', form.editionNumber.trim())
        if (form.publishDate) fd.set('publishDate', form.publishDate)
        if (form.totalBooks) fd.set('totalBooks', form.totalBooks)
        if (form.availableBooks) fd.set('availableBooks', form.availableBooks)
        if (form.location.trim()) fd.set('location', form.location.trim())
        fd.set('longDescription', JSON.stringify(plainTextToLexical(form.longDescription)))
        if (clearCover) {
          fd.set('clearImage', 'true')
        } else if (imageFile) {
          const compressed = await compressImage(imageFile)
          fd.set('image', compressed)
        }

        const result = book ? await updateBook(book.id, fd) : await createBook(fd)

        if (result.ok) {
          toast.success(book ? 'تم حفظ التعديلات' : 'تم إضافة الكتاب بنجاح')
          onOpenChange(false)
          if (!book) resetForm()
          queryClient.invalidateQueries({ queryKey: booksKeys.root })
          router.refresh()
        }
      } catch {
        toast.error(book ? 'حدث خطأ أثناء حفظ التعديلات' : 'حدث خطأ أثناء إضافة الكتاب')
      }
    })
  }

  const existingCoverRaw = (book?.image as Media | undefined)?.url
  const existingCoverUrl = existingCoverRaw ? getImageUrl(existingCoverRaw) : null
  const displayCoverUrl = imagePreview ?? (clearCover ? null : existingCoverUrl)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl" showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle className="font-alyamama text-lg">
            {book ? 'تعديل الكتاب' : 'إضافة كتاب جديد'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="max-h-[70vh] space-y-6 overflow-y-auto pe-2">
            {/* Section 1: Image + Basic Info (image on the right in RTL) */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[260px_1fr]">
              {/* Image upload */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
              {displayCoverUrl ? (
                <div className="relative min-h-[220px] overflow-hidden rounded-xl border border-border">
                  <img
                    src={displayCoverUrl}
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
                  ) : (
                    <button
                      type="button"
                      onClick={removeCover}
                      aria-label="إزالة صورة الكتاب"
                      className="absolute top-1.5 end-1.5 flex size-6 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-background-2 p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  <ImageIcon className="size-8 text-muted-foreground" />
                  <span className="text-center text-xs text-muted-foreground">صورة الكتاب</span>
                </button>
              )}

              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label>العنوان *</Label>
                    <Input
                      value={form.title}
                      onChange={(e) => update('title', e.target.value)}
                      placeholder="عنوان الكتاب"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>المؤلف *</Label>
                    <Input
                      value={form.author}
                      onChange={(e) => update('author', e.target.value)}
                      placeholder="اسم المؤلف"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label>الفئة</Label>
                    <Select value={form.category} onValueChange={(v) => v && update('category', v)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {bookCategoriesConfigArray.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>اللغة</Label>
                    <Select value={form.language} onValueChange={(v) => v && update('language', v)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="اختر اللغة" />
                      </SelectTrigger>
                      <SelectContent>
                        {languagesConfigArray.map((l) => (
                          <SelectItem key={l.value} value={l.value}>
                            {l.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label>الموقع</Label>
                    <Input
                      value={form.location}
                      onChange={(e) => update('location', e.target.value)}
                      placeholder="المكتبة المركزية"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Description */}
            <div className="flex flex-col gap-1.5">
              <Label>الوصف المختصر *</Label>
              <Textarea
                value={form.shortDescription}
                onChange={(e) => update('shortDescription', e.target.value)}
                placeholder="وصف مختصر للكتاب"
                className="min-h-20"
                required
              />
            </div>

            {/* Long description (الوصف الكامل) */}
            <div className="flex flex-col gap-1.5">
              <Label>الوصف الكامل</Label>
              <Textarea
                value={form.longDescription}
                onChange={(e) => update('longDescription', e.target.value)}
                placeholder="وصف تفصيلي كامل للكتاب (يظهر في تبويب الوصف الكامل)"
                dir="rtl"
                className="min-h-40"
              />
            </div>

            {/* Category chips (moved from the top, in place of the removed tags field) */}
            <div className="flex flex-col gap-1.5">
              <Label>التصنيف *</Label>
              <div className="flex flex-wrap gap-2" role="group" aria-label="التصنيف">
                {bookTypesConfigArray.map((t) => {
                  const selected = form.type.includes(t.value)
                  return (
                    <button
                      key={t.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleType(t.value)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors',
                        selected
                          ? 'border-primary-200 bg-primary-200/10 text-primary-300'
                          : 'border-border bg-background text-muted-foreground hover:border-primary-200/50',
                      )}
                    >
                      {selected ? <Check className="size-3.5" /> : null}
                      {t.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Section 3: Publication */}
            <div className="flex flex-col gap-3">
              <span className="text-sm font-medium text-muted-foreground">النشر</span>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <Label>الناشر</Label>
                  <Input
                    value={form.publisher}
                    onChange={(e) => update('publisher', e.target.value)}
                    placeholder="اسم الناشر"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>تاريخ النشر</Label>
                  <Input
                    type="date"
                    value={form.publishDate}
                    onChange={(e) => update('publishDate', e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>عدد الصفحات</Label>
                  <Input
                    type="number"
                    value={form.pageCount}
                    onChange={(e) => update('pageCount', e.target.value)}
                    placeholder="0"
                    min={0}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>رقم الطبعة</Label>
                  <Input
                    value={form.editionNumber}
                    onChange={(e) => update('editionNumber', e.target.value)}
                    placeholder="1"
                  />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label>ISBN</Label>
                  <Input
                    value={form.isbn}
                    onChange={(e) => update('isbn', e.target.value)}
                    placeholder="978-..."
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Inventory */}
            <div className="flex flex-col gap-3">
              <span className="text-sm font-medium text-muted-foreground">المخزون</span>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>إجمالي الكتب</Label>
                  <Input
                    type="number"
                    value={form.totalBooks}
                    onChange={(e) => update('totalBooks', e.target.value)}
                    placeholder="0"
                    min={0}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>الكتب المتوفرة</Label>
                  <Input
                    type="number"
                    value={form.availableBooks}
                    onChange={(e) => update('availableBooks', e.target.value)}
                    placeholder="0"
                    min={0}
                  />
                </div>
              </div>
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
              حفظ
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default AddBookDialog
