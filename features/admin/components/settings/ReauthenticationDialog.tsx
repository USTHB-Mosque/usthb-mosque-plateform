'use client'

import { useState, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { PasswordInput } from '@/shared/ui/password-input'
import {
  beginAdminReauthentication,
  completeAdminReauthentication,
  getAdminReauthenticationStatus,
} from '../../server/security'

export default function ReauthenticationDialog({
  open,
  onOpenChange,
  onVerified,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onVerified: (expiresAt: string) => void
}) {
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [challenge, setChallenge] = useState<string>()
  const [destination, setDestination] = useState('')
  const [deliveryFailed, setDeliveryFailed] = useState(false)
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  const close = (next: boolean) => {
    if (pending) return
    if (!next) {
      setPassword('')
      setCode('')
      setChallenge(undefined)
      setError('')
    }
    onOpenChange(next)
  }
  const confirm = () =>
    startTransition(async () => {
      setError('')
      try {
        const result = challenge
          ? await completeAdminReauthentication(challenge, code)
          : await beginAdminReauthentication(password)
        if (!result.ok) {
          setError(result.error)
          return
        }
        if (
          'challenge' in result &&
          'destination' in result &&
          typeof result.challenge === 'string' &&
          typeof result.destination === 'string'
        ) {
          setChallenge(result.challenge)
          setDestination(result.destination)
          setDeliveryFailed('deliveryFailed' in result && result.deliveryFailed === true)
          setPassword('')
          return
        }
        const expiresAt =
          'expiresAt' in result
            ? result.expiresAt
            : (await getAdminReauthenticationStatus()).expiresAt
        if (!expiresAt) {
          setError('أعد تأكيد هويتك')
          return
        }
        setPassword('')
        setCode('')
        setChallenge(undefined)
        onVerified(expiresAt)
        onOpenChange(false)
      } catch {
        setError('تعذر تأكيد الهوية، حاول مرة أخرى')
      }
    })
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent dir="rtl" showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle>تأكيد الهوية</DialogTitle>
          <DialogDescription>
            {challenge
              ? deliveryFailed
                ? 'تعذر إرسال البريد، استخدم أحد رموز الاسترداد.'
                : `أدخل الرمز المرسل إلى ${destination} أو أحد رموز الاسترداد.`
              : 'أدخل كلمة المرور الحالية لإدارة إعدادات الحماية. يسري التأكيد لخمس دقائق على هذا الجهاز فقط.'}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            confirm()
          }}
          className="space-y-4"
        >
          {challenge ? (
            <label className="flex flex-col gap-2">
              رمز التحقق أو الاسترداد
              <Input
                key="code"
                autoFocus
                autoComplete="one-time-code"
                dir="ltr"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                disabled={pending}
                required
              />
            </label>
          ) : (
            <label className="flex flex-col gap-2">
              كلمة المرور الحالية
              <PasswordInput
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={pending}
                required
              />
            </label>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? 'جارٍ التأكيد…' : challenge ? 'تأكيد الرمز' : 'تأكيد الهوية'}
            </Button>
            <Button type="button" variant="outline" onClick={() => close(false)} disabled={pending}>
              إلغاء
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
