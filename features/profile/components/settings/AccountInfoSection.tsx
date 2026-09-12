'use client'

import React, { useState, useTransition } from 'react'
import { Pencil, Check, X, User, Phone, Mail } from 'lucide-react'
import { User as UserType } from '@/payload-types'
import { updateProfileField } from '@/features/profile/server/settings'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

type AccountInfoSectionProps = {
  user: UserType
}

type FieldKey = 'fullName' | 'phone' | 'email'

const fields: { key: FieldKey; label: string; icon: React.ElementType; readOnly?: boolean }[] = [
  { key: 'fullName', label: 'الاسم الكامل', icon: User },
  { key: 'phone', label: 'رقم الهاتف', icon: Phone },
  { key: 'email', label: 'البريد الإلكتروني', icon: Mail, readOnly: true },
]

function FieldDisplay({
  field,
  value,
  isEditing,
  draft,
  setDraft,
  pending,
  onStartEdit,
  onSave,
  onCancel,
}: {
  field: (typeof fields)[number]
  value: string
  isEditing: boolean
  draft: string
  setDraft: (v: string) => void
  pending: boolean
  onStartEdit: () => void
  onSave: () => void
  onCancel: () => void
}) {
  const Icon = field.icon

  if (isEditing) {
    return (
      <div dir="rtl" className="flex items-center gap-3 bg-fill-contrast py-2 px-4 rounded-lg border border-primary-300">
        <Icon className="h-5 w-5 flex-none text-primary-300" />
        <input
          type={field.key === 'email' ? 'email' : 'text'}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={pending || field.readOnly}
          className="flex-1 bg-transparent text-base font-alyamama text-[#243245] outline-none"
          autoFocus
          dir="rtl"
        />
        {!field.readOnly && (
          <>
            <button type="button" onClick={onSave} disabled={pending} className="text-primary-300 hover:text-primary">
              <Check className="h-4 w-4" />
            </button>
            <button type="button" onClick={onCancel} disabled={pending} className="text-grey-400 hover:text-grey-500">
              <X className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    )
  }

  return (
    <div dir="rtl" className="flex items-center justify-between self-stretch bg-[#E8F2F8] py-2 px-4 rounded-lg gap-3">
      <Icon className="h-5 w-5 flex-none text-grey-400" />
      <span className="flex-1 text-right text-base font-alyamama text-[#243245]">
        {value || 'غير محدد'}
      </span>
      {!field.readOnly && (
        <button
          type="button"
          onClick={onStartEdit}
          className="text-grey-400 hover:text-primary-300 transition-colors"
          aria-label={`تعديل ${field.label}`}
        >
          <Pencil className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

const AccountInfoSection: React.FC<AccountInfoSectionProps> = ({ user }) => {
  const [editing, setEditing] = useState<FieldKey | null>(null)
  const [draft, setDraft] = useState<string>('')
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const startEdit = (key: FieldKey) => {
    const value = user[key]
    setDraft(typeof value === 'string' ? value : '')
    setEditing(key)
  }

  const cancelEdit = () => {
    setEditing(null)
    setDraft('')
  }

  const saveEdit = (key: FieldKey) => {
    startTransition(async () => {
      const fd = new FormData()
      fd.append(key, draft)
      const r = await updateProfileField(fd, key)
      if (r.ok) {
        toast.success('تم الحفظ')
        setEditing(null)
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
        {fields.slice(0, 2).map((field) => {
          const value = user[field.key]
          const displayValue = typeof value === 'string' ? value : ''
          return (
            <div key={field.key} className="flex flex-1 flex-col gap-1">
              <div className="flex flex-col items-start self-stretch">
                <span className="text-base font-alyamama text-[#243245]">{field.label}</span>
              </div>
              <FieldDisplay
                field={field}
                value={displayValue}
                isEditing={editing === field.key}
                draft={draft}
                setDraft={setDraft}
                pending={pending}
                onStartEdit={() => startEdit(field.key)}
                onSave={() => saveEdit(field.key)}
                onCancel={cancelEdit}
              />
            </div>
          )
        })}
      </div>

      {/* Phone row */}
      <div className="flex items-start gap-[25px]">
        {fields.slice(2).map((field) => {
          const value = user[field.key]
          const displayValue = typeof value === 'string' ? value : ''
          return (
            <div key={field.key} className="flex flex-1 flex-col gap-1">
              <div className="flex flex-col items-start self-stretch">
                <span className="text-base font-alyamama text-[#243245]">{field.label}</span>
              </div>
              <FieldDisplay
                field={field}
                value={displayValue}
                isEditing={editing === field.key}
                draft={draft}
                setDraft={setDraft}
                pending={pending}
                onStartEdit={() => startEdit(field.key)}
                onSave={() => saveEdit(field.key)}
                onCancel={cancelEdit}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default AccountInfoSection
