'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/shared/ui/button'
import { PasswordInput } from '@/shared/ui/password-input'
import { changeAdminPassword } from '../../server/account'

export default function PasswordForm() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  return (
    <form
      className="max-w-[432px] space-y-4"
      onSubmit={(event) => {
        event.preventDefault()
        startTransition(async () => {
          setError('')
          const data = new FormData()
          data.set('newPassword', password)
          data.set('confirmPassword', confirm)
          const result = await changeAdminPassword(data)
          if (!result.ok) {
            setError(result.error ?? 'تعذر تغيير كلمة المرور')
            return
          }
          setPassword('')
          setConfirm('')
          toast.success('تم تغيير كلمة المرور وتسجيل خروج الأجهزة الأخرى')
          router.push('/admin-panel/settings/security')
          router.refresh()
        })
      }}
    >
      <label className="flex flex-col gap-2">
        كلمة السر الجديدة
        <PasswordInput
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          disabled={pending}
          required
          className="bg-fill-contrast"
        />
      </label>
      <label className="flex flex-col gap-2">
        تأكيد كلمة السر الجديدة
        <PasswordInput
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          minLength={8}
          disabled={pending}
          required
          className="bg-fill-contrast"
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-4">
        <Button type="submit" disabled={pending}>
          تأكيد
        </Button>
        <Link
          href="/admin-panel/settings/security"
          className="rounded-lg border border-stroke-grey px-6 py-2 text-sm"
        >
          إلغاء
        </Link>
      </div>
    </form>
  )
}
