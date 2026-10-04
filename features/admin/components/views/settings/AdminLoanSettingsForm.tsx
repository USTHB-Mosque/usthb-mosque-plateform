'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Card, CardContent } from '@/shared/ui/card'
import { updateAdminLoanSettings } from '@/features/admin/server/loan-settings'
import { MAX_BORROW_LIMIT, MAX_LOAN_DURATION_DAYS } from '@/utils/constants/loans'

/**
 * #156, SPEC §7.9: loan configuration. These two values were already enforced
 * from the Settings global — they were just not editable here, only in the raw
 * Payload admin — so this form writes the global the gates already read and
 * says plainly which loans the change touches.
 */
type AdminLoanSettingsFormProps = {
  initialSettings: {
    defaultLoanDurationDays: number
    borrowLimit: number
  }
}

function SettingField({
  id,
  label,
  hint,
  value,
  max,
  onChange,
}: {
  id: string
  label: string
  hint: string
  value: number
  max: number
  onChange: (next: number) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-alyamama text-foreground">
        {label}
      </label>
      <Input
        id={id}
        type="number"
        min={1}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full max-w-[12rem]"
      />
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}

const AdminLoanSettingsForm: React.FC<AdminLoanSettingsFormProps> = ({ initialSettings }) => {
  const router = useRouter()
  const [duration, setDuration] = useState(initialSettings.defaultLoanDurationDays)
  const [limit, setLimit] = useState(initialSettings.borrowLimit)
  const [pending, startTransition] = useTransition()

  const save = () => {
    startTransition(async () => {
      const result = await updateAdminLoanSettings({
        defaultLoanDurationDays: duration,
        borrowLimit: limit,
      })
      if (result.ok) {
        toast.success('تم حفظ إعدادات الإعارة')
        router.refresh()
      } else {
        toast.error(result.error || 'تعذر حفظ الإعدادات')
      }
    })
  }

  return (
    <div dir="rtl" className="flex flex-col gap-6 px-4 pt-6 pb-6 sm:px-6 lg:flex-1 lg:p-0">
      <div className="flex flex-col gap-6">
        <h2 className="self-stretch text-xl font-bold font-dubai text-foreground">
          إعدادات الإعارة
        </h2>

        <Card className="rounded-xl border border-stroke-grey bg-background-2 ring-0">
          <CardContent className="flex flex-col gap-5 p-5">
            <SettingField
              id="defaultLoanDurationDays"
              label="مدة الإعارة الافتراضية (بالأيام)"
              hint="تُطبَّق على الكتب التي ليس لها مدة خاصة، وتُحسب من تاريخ أخذ الكتاب."
              value={duration}
              max={MAX_LOAN_DURATION_DAYS}
              onChange={setDuration}
            />
            <SettingField
              id="borrowLimit"
              label="الحد الأقصى للكتب المستعارة في وقت واحد"
              hint="عدد الإعارات النشطة التي يمكن للعضو أن يحملها. الطلب الذي يتجاوزه يُرفض."
              value={limit}
              max={MAX_BORROW_LIMIT}
              onChange={setLimit}
            />

            <p className="text-xs text-muted-foreground">
              يسري التغيير على الإعارات الجديدة فقط. الإعارات القائمة تبقى على مواعيدها الحالية.
            </p>

            <Button className="w-fit" disabled={pending} onClick={save}>
              {pending ? 'جارٍ الحفظ…' : 'حفظ الإعدادات'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default AdminLoanSettingsForm
