'use client'

import { Button } from '@/shared/ui/button'

export default function RecoveryCodesPanel({
  codes,
  onAcknowledged,
}: {
  codes: string[]
  onAcknowledged: () => void
}) {
  return (
    <section
      className="space-y-4 rounded-xl border border-primary-300 bg-primary-main-15 p-5"
      aria-label="رموز الاسترداد"
    >
      <h3 className="font-bold">احفظ رموز الاسترداد الآن</h3>
      <p className="text-sm">
        تُعرض مرة واحدة. كل رمز صالح لاستخدام واحد بعد كلمة المرور، حتى عند تعذر وصول البريد.
      </p>
      <ul dir="ltr" className="grid gap-2 font-mono text-sm sm:grid-cols-2">
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>
      <Button type="button" onClick={onAcknowledged}>
        لقد حفظت الرموز
      </Button>
    </section>
  )
}
