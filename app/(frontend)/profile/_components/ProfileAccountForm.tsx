'use client'

import React, { useTransition } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { updateProfileFullName } from '@/actions/profile'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

type ProfileAccountFormProps = {
  defaultFullName: string
}

const ProfileAccountForm: React.FC<ProfileAccountFormProps> = ({ defaultFullName }) => {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-dubai">المعلومات الشخصية</CardTitle>
        <CardDescription>تحديث الاسم الظاهر في المنصة.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4 max-w-md"
          onSubmit={(e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            startTransition(async () => {
              const r = await updateProfileFullName(fd)
              if (r.ok) {
                toast.success('تم حفظ الاسم')
                router.refresh()
              } else {
                toast.error(r.error)
              }
            })
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="fullName">الاسم الكامل</Label>
            <Input
              id="fullName"
              name="fullName"
              defaultValue={defaultFullName}
              disabled={pending}
              placeholder="اسمك"
              dir="rtl"
            />
          </div>
          <Button type="submit" disabled={pending} className="min-w-[120px]">
            {pending ? 'جاري الحفظ...' : 'حفظ'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default ProfileAccountForm
