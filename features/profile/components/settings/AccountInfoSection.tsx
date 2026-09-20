'use client'

import React, { useState, useTransition } from 'react'
import { Pencil, Check, X, User, Phone } from 'lucide-react'
import { User as UserType } from '@/payload-types'
import { updateProfileField } from '@/features/profile/server/settings'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

type AccountInfoSectionProps = {
  user: UserType
}

function ReadOnlyField({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: React.ElementType
}) {
  return (
    <div dir="rtl" className="flex flex-1 flex-col gap-1">
      <div className="flex flex-col items-start self-stretch">
        <span className="text-base font-alyamama text-[#243245]">{label}</span>
      </div>
      <div dir="rtl" className="flex items-center justify-between self-stretch bg-[#E8F2F8] py-2 px-4 rounded-lg gap-3">
        <Icon className="h-5 w-5 flex-none text-grey-400" />
        <span className="flex-1 text-right text-base font-alyamama text-[#243245]">
          {value || 'غير محدد'}
        </span>
      </div>
    </div>
  )
}

const AccountInfoSection: React.FC<AccountInfoSectionProps> = ({ user }) => {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const firstName = user.firstName || ''
  const lastName = user.lastName || ''
  const phone = user.phone || ''

  const startEdit = () => {
    setDraft(phone)
    setEditing(true)
  }

  const cancelEdit = () => {
    setEditing(false)
    setDraft('')
  }

  const saveEdit = () => {
    startTransition(async () => {
      const fd = new FormData()
      fd.append('phone', draft)
      const r = await updateProfileField(fd, 'phone')
      if (r.ok) {
        toast.success('تم الحفظ')
        setEditing(false)
        setDraft('')
        router.refresh()
      } else {
        toast.error(r.error)
      }
    })
  }

  return (
    <div dir="rtl" className="flex flex-1 flex-col gap-6 pt-6">
      <span className="text-xl font-bold font-dubai text-[#243245]">معلومات الحساب</span>

      {/* Name fields row */}
      <div className="flex items-start gap-[25px]">
        <ReadOnlyField label="الاسم الأول" value={firstName} icon={User} />
        <ReadOnlyField label="اسم العائلة" value={lastName} icon={User} />
      </div>

      {/* Phone row — editable */}
      <div className="flex items-start gap-[25px]">
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex flex-col items-start self-stretch">
            <span className="text-base font-alyamama text-[#243245]">رقم الهاتف</span>
          </div>
          {editing ? (
            <div dir="rtl" className="flex items-center gap-3 bg-fill-contrast py-2 px-4 rounded-lg border border-primary-300">
              <Phone className="h-5 w-5 flex-none text-primary-300" />
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={pending}
                className="flex-1 bg-transparent text-base font-alyamama text-[#243245] outline-none"
                autoFocus
                dir="rtl"
              />
              <button type="button" onClick={saveEdit} disabled={pending} className="text-primary-300 hover:text-primary">
                <Check className="h-4 w-4" />
              </button>
              <button type="button" onClick={cancelEdit} disabled={pending} className="text-grey-400 hover:text-grey-500">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div dir="rtl" className="flex items-center justify-between self-stretch bg-[#E8F2F8] py-2 px-4 rounded-lg gap-3">
              <Phone className="h-5 w-5 flex-none text-grey-400" />
              <span className="flex-1 text-right text-base font-alyamama text-[#243245]">
                {phone || 'غير محدد'}
              </span>
              <button
                type="button"
                onClick={startEdit}
                className="text-grey-400 hover:text-primary-300 transition-colors"
                aria-label="تعديل رقم الهاتف"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AccountInfoSection
