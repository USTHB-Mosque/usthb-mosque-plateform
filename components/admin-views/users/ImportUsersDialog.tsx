'use client'

import React, { useRef, useState, useTransition } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Loader2, Upload, FileWarning, CheckCircle2, Info } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { previewUsersImport, commitUsersImport } from '@/features/admin/server/csv'

import type { CsvPreviewResult } from '@/features/admin/server/csv'

interface ImportUsersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const PREVIEW_COLUMNS = ['email', 'fullName', 'situation', 'role', 'verificationStatus']

const ImportUsersDialog: React.FC<ImportUsersDialogProps> = ({ open, onOpenChange }) => {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<CsvPreviewResult | null>(null)

  const reset = () => {
    setFile(null)
    setResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleClose = (next: boolean) => {
    if (pending) return
    if (!next) reset()
    onOpenChange(next)
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    if (!/text\/csv|text\/plain|csv/i.test(selected.type) && !selected.name.endsWith('.csv')) {
      toast.error('يرجى اختيار ملف CSV')
      return
    }

    startTransition(async () => {
      try {
        const preview = await previewUsersImport(selected)
        setFile(selected)
        setResult(preview)
      } catch {
        toast.error('حدث خطأ أثناء قراءة الملف')
      }
    })
  }

  const handleImport = () => {
    if (!file) return

    startTransition(async () => {
      try {
        const outcome = await commitUsersImport(file)
        if (outcome.ok) {
          toast.success(
            `تم استيراد ${outcome.created} ${outcome.created === 1 ? 'مستخدم' : 'مستخدم'} بنجاح`,
          )
          handleClose(false)
          router.refresh()
        } else {
          toast.error(`تعذر الاستيراد — ${outcome.errors.length} سطراً غير صالح`)
          setResult((prev) =>
            prev ? { ...prev, invalidCount: outcome.errors.length, errors: outcome.errors } : prev,
          )
        }
      } catch {
        toast.error('حدث خطأ أثناء الاستيراد')
      }
    })
  }

  const importDisabled = pending || !file || !result || result.invalidCount > 0

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl" showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle className="font-alyamama text-lg">استيراد المستخدمين من ملف CSV</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFile}
          />
          {!result ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={pending}
              className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-background-2 p-6 text-center transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              {pending ? (
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
              ) : (
                <Upload className="size-8 text-muted-foreground" />
              )}
              <span className="text-sm font-medium">اختر ملف CSV لاستيراد المستخدمين</span>
              <span className="max-w-md text-xs text-muted-foreground">
                الأعمدة: البريد الإلكتروني *، كلمة المرور *، الاسم الكامل، الهاتف، الكلية، التخصص،
                السنة الدراسية، الوضعية، الدور، حالة التحقق. الملف يرفض كلياً إذا احتوى على سطر غير
                صالح.
              </span>
            </button>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 text-sm">
                  <Info className="size-4 text-muted-foreground" />
                  <span className="truncate font-medium">
                    {file ? file.name : ''}
                    <span className="text-muted-foreground"> — {result.total} صف</span>
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  {result.invalidCount === 0 ? (
                    <span className="flex items-center gap-1.5 font-medium text-emerald-600">
                      <CheckCircle2 className="size-4" />
                      جميع الصفوف صالحة ({result.validCount})
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 font-medium text-destructive">
                      <FileWarning className="size-4" />
                      {result.invalidCount} صفاً غير صالح
                    </span>
                  )}
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    تغيير الملف
                  </Button>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="max-h-36 overflow-y-auto rounded-xl border border-destructive/30 bg-destructive/5 p-3">
                  <p className="mb-2 text-xs font-medium text-destructive">أخطاء يجب تصحيحها:</p>
                  <ul className="flex flex-col gap-1 text-xs text-destructive/90">
                    {result.errors.map((error) => (
                      <li key={`${error.row}-${error.message}`}>
                        السطر {error.row}: {error.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.preview.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-border bg-card">
                  <table className="w-full text-right text-sm">
                    <thead className="bg-background-2 text-xs text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2">#</th>
                        {PREVIEW_COLUMNS.map((column) => (
                          <th key={column} className="px-3 py-2">
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.preview.map((row) => (
                        <tr key={row.row} className="border-t border-border">
                          <td className="px-3 py-2 text-muted-foreground">{row.row}</td>
                          {PREVIEW_COLUMNS.map((column) => (
                            <td key={column} className="max-w-[180px] truncate px-3 py-2">
                              {row.values[column] || (
                                <span className="text-muted-foreground/50">—</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={pending}
          >
            إلغاء
          </Button>
          <Button type="button" onClick={handleImport} disabled={importDisabled}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            استيراد
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ImportUsersDialog
