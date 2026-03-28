'use client'

import React, { useTransition } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { changePassword } from '@/actions/profile'
import { toast } from 'sonner'

const ProfilePasswordForm: React.FC = () => {
  const [pending, startTransition] = useTransition()

  return (
    <Card className="p-6">
      <CardHeader>
        <CardTitle className="text-xl font-dubai">كلمة المرور</CardTitle>
        <CardDescription>غيّر كلمة المرور مع إدخال كلمة المرور الحالية للتحقق.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4 max-w-md"
          onSubmit={(e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            startTransition(async () => {
              const r = await changePassword(fd)
              if (r.ok) {
                toast.success('تم تغيير كلمة المرور')
                ;(e.target as HTMLFormElement).reset()
              } else {
                toast.error(r.error)
              }
            })
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="currentPassword">كلمة المرور الحالية</Label>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              disabled={pending}
              dir="ltr"
              className="text-left"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              disabled={pending}
              dir="ltr"
              className="text-left"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              disabled={pending}
              dir="ltr"
              className="text-left"
            />
          </div>
          <Button type="submit" disabled={pending} className="min-w-[120px]">
            {pending ? 'جاري التحديث...' : 'تحديث كلمة المرور'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default ProfilePasswordForm
