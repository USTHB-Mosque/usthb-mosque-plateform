'use client'

import { useContext, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Switch } from '@/shared/ui/switch'
import ConfirmDialog from '@/shared/ui/confirm-dialog'
import { RecoveryCodesContext } from './SecurityGate'
import RecoveryCodesPanel from './RecoveryCodesPanel'
import {
  beginAdminTwoFactorEnrollment,
  confirmAdminTwoFactorEnrollment,
  disableAdminTwoFactor,
  regenerateAdminRecoveryCodes,
} from '../../server/security'

export default function TwoFactorSettings({
  enabled,
  recoveryCodesRemaining,
}: {
  enabled: boolean
  recoveryCodesRemaining: number
}) {
  const [challenge, setChallenge] = useState<string>()
  const [code, setCode] = useState('')
  const [codes, setCodes] = useState<string[]>()
  const retainCodes = useContext(RecoveryCodesContext)
  const revealCodes = retainCodes ?? setCodes
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState<'disable' | 'regenerate'>()
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const enroll = () =>
    startTransition(async () => {
      setError('')
      const result = await beginAdminTwoFactorEnrollment()
      if (!result.ok) {
        setError(result.error)
        return
      }
      setChallenge(result.challenge)
      setCode('')
    })
  return (
    <div className="max-w-[532px] space-y-6">
      <p className="text-sm text-muted-foreground">
        أضف رمزاً يُرسل إلى بريدك الرئيسي بعد كلمة المرور عند تسجيل الدخول.
      </p>
      <div className="divide-y divide-stroke-grey rounded-xl border border-stroke-grey bg-background-2">
        <div className="flex items-center justify-between gap-4 p-5">
          <div className="space-y-2">
            <h3 className="font-khalid">عبر البريد الإلكتروني</h3>
            <p className="text-sm text-muted-foreground">يتم إرسال رسالة تأكيد إلى بريدك</p>
          </div>
          <Switch
            aria-label="المصادقة عبر البريد الإلكتروني"
            checked={enabled}
            disabled={pending || Boolean(challenge)}
            onCheckedChange={(value) => (value ? enroll() : setConfirmation('disable'))}
          />
        </div>
        <div className="flex items-center justify-between gap-4 p-5">
          <div className="space-y-2">
            <h3 className="font-khalid">عبر رقم الهاتف (SMS)</h3>
            <p className="text-sm text-muted-foreground">غير متوفر حالياً</p>
          </div>
          <Switch aria-label="المصادقة عبر SMS غير متوفرة" checked={false} disabled />
        </div>
      </div>
      {challenge && (
        <form
          className="space-y-4 rounded-xl border border-stroke-grey bg-background-2 p-5"
          onSubmit={(event) => {
            event.preventDefault()
            startTransition(async () => {
              setError('')
              const result = await confirmAdminTwoFactorEnrollment(challenge, code)
              if (!result.ok) {
                setError(result.error)
                return
              }
              revealCodes(result.recoveryCodes)
              setChallenge(undefined)
              setCode('')
              toast.success('تم تفعيل المصادقة الثنائية')
              router.refresh()
            })
          }}
        >
          <label className="flex flex-col gap-2">
            رمز تفعيل المصادقة الثنائية
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
            تفعيل المصادقة الثنائية
          </Button>
        </form>
      )}
      {enabled && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            رموز الاسترداد المتبقية: {recoveryCodesRemaining}
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => setConfirmation('regenerate')}
          >
            إنشاء رموز استرداد جديدة
          </Button>
        </div>
      )}
      {codes && <RecoveryCodesPanel codes={codes} onAcknowledged={() => setCodes(undefined)} />}
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
        title={confirmation === 'disable' ? 'تعطيل المصادقة الثنائية؟' : 'استبدال رموز الاسترداد؟'}
        description={
          confirmation === 'disable'
            ? 'ستعود الحسابات إلى تسجيل الدخول بكلمة المرور، وستُسجّل الأجهزة الأخرى خروجها.'
            : 'ستتوقف الرموز السابقة عن العمل وستُسجّل الأجهزة الأخرى خروجها.'
        }
        confirmLabel={confirmation === 'disable' ? 'تعطيل المصادقة الثنائية' : 'إنشاء الرموز'}
        busy={pending}
        onConfirm={() =>
          startTransition(async () => {
            setError('')
            if (confirmation === 'disable') {
              const result = await disableAdminTwoFactor()
              if (!result.ok) {
                setError(result.error)
                setConfirmation(undefined)
                return
              }
              setCodes(undefined)
              setConfirmation(undefined)
              toast.success('تم تعطيل المصادقة الثنائية')
              router.push('/admin-panel/settings/security')
              router.refresh()
            } else {
              const result = await regenerateAdminRecoveryCodes()
              if (!result.ok) {
                setError(result.error)
                setConfirmation(undefined)
                return
              }
              revealCodes(result.recoveryCodes)
              setConfirmation(undefined)
              router.refresh()
            }
          })
        }
      />
    </div>
  )
}
