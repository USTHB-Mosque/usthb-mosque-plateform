'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, MoreVertical } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Badge } from '@/shared/ui/badge'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/shared/ui/dropdown-menu'
import ConfirmDialog from '@/shared/ui/confirm-dialog'
import {
  requestAdminEmailVerification,
  confirmAdminEmail,
  setAdminPrimaryEmail,
  removeAdminEmail,
} from '../../server/emails'

type Address = { id: number; address: string; verified: boolean; primary: boolean }

export default function EmailSettings({ addresses }: { addresses: Address[] }) {
  const [address, setAddress] = useState('')
  const [challenge, setChallenge] = useState<string>()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState<{
    action: 'primary' | 'remove'
    email: Address
  }>()
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const send = (value: string) =>
    startTransition(async () => {
      setError('')
      try {
        const result = await requestAdminEmailVerification(value)
        if (!result.ok) {
          setError(result.error)
          return
        }
        setAddress(value.trim().toLowerCase())
        setChallenge(result.challenge)
        setCode('')
        toast.success('تم إرسال رمز توثيق البريد')
        router.refresh()
      } catch {
        setError('تعذر إرسال رمز التوثيق')
      }
    })
  return (
    <div className="max-w-[532px] space-y-6">
      {[
        [true, 'قائمة البريد الإلكتروني الموثق'],
        [false, 'عناوين بانتظار التوثيق'],
      ].map(([verified, label]) => {
        const entries = addresses.filter((email) => email.verified === verified)
        if (!entries.length && !verified) return null
        return (
          <section key={String(verified)} className="space-y-4">
            <h3 className="font-bold text-foreground">{String(label)}</h3>
            {entries.length ? (
              <div className="divide-y divide-stroke-grey rounded-xl border border-stroke-grey bg-background-2">
                {entries.map((email) => (
                  <div key={email.id} className="flex items-center justify-between gap-3 p-5">
                    <div className="flex min-w-0 items-center gap-3">
                      <Mail className="size-7 shrink-0 text-primary-300" aria-hidden="true" />
                      <div className="min-w-0 space-y-2">
                        <bdi className="block break-all text-sm">{email.address}</bdi>
                        {email.primary && <Badge variant="outline">الرئيسي</Badge>}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`إدارة ${email.address}`}
                            disabled={pending}
                          />
                        }
                      >
                        <MoreVertical aria-hidden="true" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!email.verified && (
                          <DropdownMenuItem onClick={() => send(email.address)}>
                            توثيق البريد
                          </DropdownMenuItem>
                        )}
                        {email.verified && !email.primary && (
                          <DropdownMenuItem
                            onClick={() => setConfirmation({ action: 'primary', email })}
                          >
                            تعيين رئيسي
                          </DropdownMenuItem>
                        )}
                        {!email.primary && (
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setConfirmation({ action: 'remove', email })}
                          >
                            حذف البريد
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-stroke-grey bg-background-2 p-5 text-sm text-muted-foreground">
                لم يتم توثيق أي بريد بعد.
              </p>
            )}
          </section>
        )
      })}
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          send(address)
        }}
      >
        <label htmlFor="additional-email" className="block text-xl font-bold">
          إضافة بريد
        </label>
        <div className="flex flex-wrap gap-4">
          <Input
            id="additional-email"
            type="email"
            dir="ltr"
            autoComplete="email"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            required
            disabled={pending}
            className="min-w-0 flex-1 bg-fill-contrast"
          />
          <Button type="submit" disabled={pending}>
            أضف
          </Button>
        </div>
      </form>
      {challenge && (
        <form
          className="space-y-3 rounded-xl border border-stroke-grey bg-background-2 p-5"
          onSubmit={(event) => {
            event.preventDefault()
            startTransition(async () => {
              setError('')
              const result = await confirmAdminEmail(challenge, code)
              if (!result.ok) {
                setError(result.error)
                return
              }
              setChallenge(undefined)
              setCode('')
              toast.success('تم توثيق البريد الإلكتروني')
              router.refresh()
            })
          }}
        >
          <p className="break-all text-sm">
            أدخل الرمز المرسل إلى <bdi>{address}</bdi>. صالح لخمس دقائق.
          </p>
          <label className="flex flex-col gap-2">
            رمز توثيق البريد
            <Input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoComplete="one-time-code"
              inputMode="numeric"
              dir="ltr"
              required
              disabled={pending}
            />
          </label>
          <Button type="submit" disabled={pending}>
            توثيق البريد
          </Button>
        </form>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <ConfirmDialog
        open={Boolean(confirmation)}
        onOpenChange={(open) => {
          if (!open) setConfirmation(undefined)
        }}
        title={
          confirmation?.action === 'primary' ? 'تغيير البريد الرئيسي؟' : 'حذف البريد الإلكتروني؟'
        }
        description={
          confirmation?.action === 'primary'
            ? 'سيُستخدم هذا العنوان لتسجيل الدخول والاسترداد، وستُسجّل الأجهزة الأخرى خروجها.'
            : 'سيُزال هذا العنوان من حسابك.'
        }
        confirmLabel={confirmation?.action === 'primary' ? 'تعيين رئيسي' : 'حذف البريد'}
        busy={pending}
        onConfirm={() =>
          startTransition(async () => {
            if (!confirmation) return
            const result =
              confirmation.action === 'primary'
                ? await setAdminPrimaryEmail(confirmation.email.id)
                : await removeAdminEmail(confirmation.email.id)
            if (!result.ok) {
              setError(result.error)
              setConfirmation(undefined)
              return
            }
            const promoted = confirmation.action === 'primary'
            setConfirmation(undefined)
            toast.success('تم حفظ إعدادات البريد')
            if (promoted) router.push('/admin-panel/settings/security')
            router.refresh()
          })
        }
      />
      <p className="text-sm text-muted-foreground">
        تسجيل الدخول واسترداد كلمة المرور والإشعارات تستخدم البريد الرئيسي فقط.
      </p>
    </div>
  )
}
