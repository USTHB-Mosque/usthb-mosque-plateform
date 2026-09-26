'use client'

import React, { useState, useTransition, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Switch } from '@/shared/ui/switch'
import { createActivity, updateActivity } from '@/features/admin'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Loader2, X, ImageIcon, Pencil, Plus } from 'lucide-react'
import { activitiesTypesConfigArray } from '@/utils/constants/activities'
import type { Activity, Media } from '@/payload-types'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import { getImageUrl } from '@/shared/lib/image-utils'
import { activitiesKeys } from '@/features/activities/api/activities.queries'
import { compressImage } from '@/utils/image-compress'
import { lexicalToPlainText, plainTextToLexical } from '@/utils/rich-text'

interface AddActivityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activity?: Activity | null
}

const EMPTY_FORM = {
  title: '',
  type: '',
  location: '',
  supervisor: '',
  shortDescription: '',
  longDescription: '',
  startDate: '',
  registrationDeadline: '',
  maxParticipants: '',
  openForRegistration: false,
}

function toDatetimeLocal(value?: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`
}

function activityToForm(activity?: Activity | null) {
  if (!activity) return EMPTY_FORM
  return {
    title: activity.title ?? '',
    type: activity.type ?? '',
    location: activity.location ?? '',
    supervisor: activity.supervisor ?? '',
    shortDescription: activity.shortDescription ?? '',
    longDescription: lexicalToPlainText(
      activity.longDescription as SerializedEditorState | null | undefined,
    ),
    startDate: toDatetimeLocal(activity.startDate),
    registrationDeadline: toDatetimeLocal(activity.registrationDeadline),
    maxParticipants: activity.maxParticipants != null ? String(activity.maxParticipants) : '',
    openForRegistration: activity.openForRegistration === true,
  }
}

const AddActivityDialog: React.FC<AddActivityDialogProps> = ({ open, onOpenChange, activity }) => {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState(() => activityToForm(activity))
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [clearImage, setClearImage] = useState(false)
  const [benefits, setBenefits] = useState<string[]>(() =>
    (activity?.benefits ?? []).map((b) => b.name ?? ''),
  )
  const [audience, setAudience] = useState<string[]>(() =>
    (activity?.targetAudience ?? []).map((a) => a.name ?? ''),
  )
  const [schedules, setSchedules] = useState<string[]>(() =>
    (activity?.schedules ?? []).map((s) => toDatetimeLocal(s.dateAndTime)),
  )

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

  const addListItem = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>) => {
    setList([...list, ''])
  }

  const updateListItem = (
    index: number,
    value: string,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
  ) => {
    setList(list.map((item, i) => (i === index ? value : item)))
  }

  const removeListItem = (
    index: number,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
  ) => {
    setList(list.filter((_, i) => i !== index))
  }

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setBenefits([])
    setAudience([])
    setSchedules([])
    removeImage()
    setClearImage(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (
      !form.title.trim() ||
      !form.type ||
      !form.shortDescription.trim() ||
      !form.longDescription.trim() ||
      !form.startDate ||
      schedules.filter((s) => s).length === 0
    ) {
      toast.error('يرجى ملء جميع الحقول المطلوبة')
      return
    }

    if (!activity && !imageFile) {
      toast.error('يرجى اختيار صورة للنشاط')
      return
    }

    if (activity && clearImage && !imageFile) {
      toast.error('يرجى اختيار صورة جديدة للنشاط بعد إزالة الصورة الحالية')
      return
    }

    startTransition(async () => {
      try {
        const fd = new FormData()
        fd.set('title', form.title.trim())
        fd.set('type', form.type)
        fd.set('shortDescription', form.shortDescription.trim())
        fd.set('longDescription', JSON.stringify(plainTextToLexical(form.longDescription)))
        fd.set(
          'benefits',
          JSON.stringify(benefits.filter((b) => b.trim()).map((name) => ({ name }))),
        )
        fd.set(
          'targetAudience',
          JSON.stringify(audience.filter((a) => a.trim()).map((name) => ({ name }))),
        )
        fd.set(
          'schedules',
          JSON.stringify(schedules.filter((s) => s).map((dateAndTime) => ({ dateAndTime }))),
        )
        if (form.location.trim()) fd.set('location', form.location.trim())
        if (form.supervisor.trim()) fd.set('supervisor', form.supervisor.trim())
        fd.set('openForRegistration', String(form.openForRegistration))
        if (form.registrationDeadline) fd.set('registrationDeadline', form.registrationDeadline)
        fd.set('startDate', form.startDate)
        if (form.maxParticipants) fd.set('maxParticipants', form.maxParticipants)
        if (imageFile) {
          const compressed = await compressImage(imageFile)
          fd.set('image', compressed)
        }

        const result = activity ? await updateActivity(activity.id, fd) : await createActivity(fd)

        if (result.ok) {
          toast.success(activity ? 'تم حفظ التعديلات' : 'تم إنشاء النشاط بنجاح')
          onOpenChange(false)
          if (!activity) resetForm()
          queryClient.invalidateQueries({ queryKey: activitiesKeys.root })
          router.refresh()
        }
      } catch {
        toast.error(activity ? 'حدث خطأ أثناء حفظ التعديلات' : 'حدث خطأ أثناء إنشاء النشاط')
      }
    })
  }

  const existingImageRaw = (activity?.image as Media | undefined)?.url
  const existingImageUrl = existingImageRaw ? getImageUrl(existingImageRaw) : null
  const displayImageUrl = imagePreview ?? (clearImage ? null : existingImageUrl)

  const textListEditor = (
    title: string,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    placeholder: string,
  ) => (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-medium text-muted-foreground">{title} *</span>
      {list.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            value={item}
            onChange={(e) => updateListItem(index, e.target.value, list, setList)}
            placeholder={placeholder}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            onClick={() => removeListItem(index, list, setList)}
            aria-label={`حذف ${title}`}
            className="shrink-0 text-muted-foreground hover:text-destructive"
          >
            <X className="size-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        className="gap-2"
        onClick={() => addListItem(list, setList)}
      >
        <Plus className="size-4" />
        إضافة
      </Button>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl" showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle className="font-alyamama text-lg">
            {activity ? 'تعديل النشاط' : 'إضافة نشاط جديد'}
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
                  ) : activity ? (
                    <button
                      type="button"
                      onClick={removeCover}
                      aria-label="إزالة صورة النشاط"
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
                  <span className="text-center text-xs text-muted-foreground">صورة النشاط *</span>
                </button>
              )}

              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label>العنوان *</Label>
                    <Input
                      value={form.title}
                      onChange={(e) => update('title', e.target.value)}
                      placeholder="عنوان النشاط"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>النوع *</Label>
                    <Select value={form.type} onValueChange={(v) => v && update('type', v)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="اختر النوع" />
                      </SelectTrigger>
                      <SelectContent>
                        {activitiesTypesConfigArray.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label>المكان</Label>
                    <Input
                      value={form.location}
                      onChange={(e) => update('location', e.target.value)}
                      placeholder="قاعة المحاضرات"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>المشرف (تحت إشراف)</Label>
                    <Input
                      value={form.supervisor}
                      onChange={(e) => update('supervisor', e.target.value)}
                      placeholder="اسم المشرف"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>الوصف المختصر *</Label>
              <Textarea
                value={form.shortDescription}
                onChange={(e) => update('shortDescription', e.target.value)}
                placeholder="وصف مختصر للنشاط"
                className="min-h-16"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>الوصف التفصيلي *</Label>
              <Textarea
                value={form.longDescription}
                onChange={(e) => update('longDescription', e.target.value)}
                placeholder="وصف تفصيلي كامل للنشاط"
                dir="rtl"
                className="min-h-32"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {textListEditor('فوائد النشاط', benefits, setBenefits, 'فائدة من الفوائد')}
              {textListEditor('الفئة المستهدفة', audience, setAudience, 'فئة من الفئات المستهدفة')}
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-sm font-medium text-muted-foreground">المواعيد *</span>
              {schedules.map((schedule, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    type="datetime-local"
                    value={schedule}
                    onChange={(e) => updateListItem(index, e.target.value, schedules, setSchedules)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-lg"
                    onClick={() => removeListItem(index, schedules, setSchedules)}
                    aria-label="حذف الموعد"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() => addListItem(schedules, setSchedules)}
              >
                <Plus className="size-4" />
                إضافة موعد
              </Button>
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-sm font-medium text-muted-foreground">التسجيل</span>
              <div className="flex items-center justify-between rounded-xl border border-border bg-background p-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">فتح باب التسجيل</span>
                  <span className="text-xs text-muted-foreground">السماح للطلاب بالتسجيل</span>
                </div>
                <Switch
                  checked={form.openForRegistration}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, openForRegistration: checked }))
                  }
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <Label>تاريخ البداية *</Label>
                  <Input
                    type="datetime-local"
                    value={form.startDate}
                    onChange={(e) => update('startDate', e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>آخر موعد للتسجيل</Label>
                  <Input
                    type="datetime-local"
                    value={form.registrationDeadline}
                    onChange={(e) => update('registrationDeadline', e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>الحد الأقصى للمشاركين</Label>
                  <Input
                    type="number"
                    value={form.maxParticipants}
                    onChange={(e) => update('maxParticipants', e.target.value)}
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
              {activity ? 'حفظ التعديلات' : 'إنشاء النشاط'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default AddActivityDialog
