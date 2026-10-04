'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import type { User } from '@/payload-types'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { updateAdminAccountInfo } from '../../server/account'

export default function AccountInfoForm({ user }: { user: User }) {
  const parts = (user.fullName ?? '').split(' ')
  const [firstName, setFirstName] = useState(user.firstName ?? parts[0] ?? '')
  const [lastName, setLastName] = useState(user.lastName ?? parts.slice(1).join(' '))
  const [phone, setPhone] = useState(user.phone ?? '')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  return (
    <form
      className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6 lg:px-0"
      onSubmit={(event) => {
        event.preventDefault()
        startTransition(async () => {
          setError('')
          const data = new FormData()
          data.set('firstName', firstName)
          data.set('lastName', lastName)
          data.set('phone', phone)
          try {
            const result = await updateAdminAccountInfo(data)
            if (!result.ok) {
              setError(result.error)
              return
            }
            toast.success('تم حفظ معلومات الحساب')
            router.refresh()
          } catch {
            setError('تعذر حفظ معلومات الحساب')
          }
        })
      }}
    >
      <h2 className="text-xl font-bold text-foreground">معلومات الحساب</h2>
      <div className="grid gap-6 sm:grid-cols-2">
        <label className="space-y-2">
          الإسم
          <Input
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            disabled={pending}
            required
            autoComplete="given-name"
            className="bg-fill-contrast"
          />
        </label>
        <label className="space-y-2">
          اللقب
          <Input
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            disabled={pending}
            required
            autoComplete="family-name"
            className="bg-fill-contrast"
          />
        </label>
        <label className="space-y-2">
          رقم الهاتف
          <Input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            disabled={pending}
            autoComplete="tel"
            dir="ltr"
            className="bg-fill-contrast"
          />
        </label>
        <div className="space-y-2">
          <label htmlFor="admin-primary-email">البريد الإلكتروني</label>
          <Input
            id="admin-primary-email"
            value={user.email}
            readOnly
            dir="ltr"
            className="bg-fill-contrast"
          />
          <Link
            href="/admin-panel/settings/security/email"
            className="text-sm text-primary-300 underline"
          >
            إدارة البريد الإلكتروني
          </Link>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? 'جارٍ الحفظ…' : 'حفظ المعلومات'}
      </Button>
    </form>
  )
}
