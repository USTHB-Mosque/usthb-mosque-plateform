'use client'

import React, { useState, useTransition } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { createAdminUser } from '@/features/admin/server/users'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Loader2, UserPlus } from 'lucide-react'

interface AddUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const ROLE_OPTIONS = [
  { value: 'admin', label: 'مشرف' },
  { value: 'librarian', label: 'أمين مكتبة' },
]

const AddUserDialog: React.FC<AddUserDialogProps> = ({ open, onOpenChange }) => {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'librarian',
  })

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const resetForm = () => {
    setForm({ fullName: '', email: '', password: '', role: 'librarian' })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.email.trim() || !form.password.trim()) {
      toast.error('يرجى ملء البريد الإلكتروني وكلمة المرور')
      return
    }

    if (form.password.length < 8) {
      toast.error('كلمة المرور يجب أن تكون 8 أحرف على الأقل')
      return
    }

    startTransition(async () => {
      const result = await createAdminUser({
        fullName: form.fullName.trim() || undefined,
        email: form.email.trim(),
        password: form.password,
        role: form.role as 'admin' | 'librarian',
      })

      if (result.ok) {
        toast.success('تم إنشاء المستخدم بنجاح')
        onOpenChange(false)
        resetForm()
        router.refresh()
      } else {
        toast.error(result.error || 'تعذر إنشاء المستخدم')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle className="font-alyamama text-lg">إضافة مستخدم</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>الاسم الكامل</Label>
              <Input
                value={form.fullName}
                onChange={(e) => update('fullName', e.target.value)}
                placeholder="الاسم الكامل"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>البريد الإلكتروني *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder="user@example.com"
                dir="ltr"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>كلمة المرور *</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                placeholder="8 أحرف على الأقل"
                dir="ltr"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>الدور</Label>
              <Select value={form.role} onValueChange={(v) => v && update('role', v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <Button type="submit" disabled={pending} className="gap-2">
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <UserPlus className="size-4" />
              )}
              إضافة
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default AddUserDialog
