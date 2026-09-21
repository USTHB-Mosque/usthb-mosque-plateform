'use client'

import React, { useState } from 'react'
import { Mail, Key, Smartphone, Activity, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { User } from '@/payload-types'
import ConnectedDevices from './ConnectedDevices'
import ActivityLog from './ActivityLog'

type SecuritySectionProps = {
  user: User
  className?: string
}

type ActiveView = null | { section: string; item: string; label: string }

function getSections(user: User) {
  const logCount = user.activityLog?.length ?? 0
  return [
    {
      title: 'خيارات تسجيل الدخول',
      items: [
        {
          id: 'email',
          label: 'البريد الإلكتروني',
          subtitle: 'البريد الإلكتروني المُوَثَّق: 2',
          icon: Mail,
          buttonText: 'إدارة',
        },
        {
          id: 'password',
          label: 'كلمة السر',
          subtitle: 'مُعَدَّة',
          icon: Key,
          buttonText: 'تغيير',
        },
      ],
    },
    {
      title: 'نشاط الحساب',
      items: [
        {
          id: 'devices',
          label: 'الأجهزة المرتبطة',
          subtitle: 'عدد الأجهزة المرتبطة: 2',
          icon: Smartphone,
          buttonText: 'إدارة',
        },
        {
          id: 'activity-log',
          label: 'سجل أحداث الحساب',
          subtitle: logCount > 0 ? `أحداث جديدة: ${logCount}` : 'لا توجد أحداث',
          icon: Activity,
          buttonText: 'تفقد',
        },
      ],
    },
  ]
}

function PasswordForm({ onBack }: { onBack: () => void }) {
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  return (
    <div className="flex flex-col self-stretch gap-6">
      <div className="self-stretch bg-background-2 rounded-xl border border-solid border-stroke-grey p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-start gap-1">
            <label className="text-base font-alyamama text-[#243245]">كلمة المرور الحالية</label>
            <div className="relative w-full">
              <input
                type={showCurrent ? 'text' : 'password'}
                placeholder="أدخل كلمة المرور الحالية"
                className="w-full bg-fill-contrast py-2 ps-4 pe-10 rounded-lg border border-stroke-grey text-base font-alyamama text-[#243245] outline-none focus:border-primary-300"
                dir="rtl"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-grey-400 hover:text-grey-500 cursor-pointer"
              >
                {showCurrent ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          <div className="flex flex-col items-start gap-1">
            <label className="text-base font-alyamama text-[#243245]">كلمة المرور الجديدة</label>
            <div className="relative w-full">
              <input
                type={showNew ? 'text' : 'password'}
                placeholder="أدخل كلمة المرور الجديدة"
                className="w-full bg-fill-contrast py-2 ps-4 pe-10 rounded-lg border border-stroke-grey text-base font-alyamama text-[#243245] outline-none focus:border-primary-300"
                dir="rtl"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-grey-400 hover:text-grey-500 cursor-pointer"
              >
                {showNew ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          <div className="flex flex-col items-start gap-1">
            <label className="text-base font-alyamama text-[#243245]">تأكيد كلمة المرور</label>
            <div className="relative w-full">
              <input
                type={showConfirm ? 'text' : 'password'}
                placeholder="أعد إدخال كلمة المرور الجديدة"
                className="w-full bg-fill-contrast py-2 ps-4 pe-10 rounded-lg border border-stroke-grey text-base font-alyamama text-[#243245] outline-none focus:border-primary-300"
                dir="rtl"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-grey-400 hover:text-grey-500 cursor-pointer"
              >
                {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center bg-fill-contrast text-[#243245] py-2 px-6 rounded-lg border border-stroke-grey text-base font-alyamama transition-colors hover:bg-stroke-grey cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="button"
              className="flex items-center bg-primary text-fill-main py-2 px-6 rounded-lg text-base font-bold font-alyamama transition-colors hover:bg-primary-300 cursor-pointer"
            >
              تأكيد
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const SecuritySection: React.FC<SecuritySectionProps> = ({ user, className }) => {
  const [activeView, setActiveView] = useState<ActiveView>(null)

  if (activeView) {
    return (
      <div dir="rtl" className={cn('flex flex-1 flex-col pt-6 gap-6', className)}>
        {/* Breadcrumb title */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveView(null)}
            className="text-xl font-bold font-dubai text-[#243245] hover:text-primary-300 transition-colors cursor-pointer"
          >
            {activeView.section}
          </button>
          <ArrowLeft className="h-5 w-5 text-grey-400" />
          <span className="text-xl font-bold font-dubai text-primary-300">{activeView.label}</span>
        </div>

        {/* Form content */}
        {activeView.item === 'password' && <PasswordForm onBack={() => setActiveView(null)} />}
        {activeView.item === 'devices' && <ConnectedDevices onBack={() => setActiveView(null)} />}
        {activeView.item === 'activity-log' && (
          <ActivityLog user={user} onBack={() => setActiveView(null)} />
        )}
      </div>
    )
  }

  return (
    <div dir="rtl" className={cn('flex flex-1 flex-col pt-6 gap-8', className)}>
      {getSections(user).map((section) => (
        <div key={section.title} className="flex flex-col self-stretch gap-6">
          <div className="flex flex-col items-start self-stretch">
            <span className="text-xl font-bold font-dubai text-[#243245]">{section.title}</span>
          </div>
          <div className="self-stretch bg-background-2 rounded-xl border border-solid border-stroke-grey">
            {section.items.map((item, index) => {
              const Icon = item.icon
              return (
                <div
                  key={item.id}
                  className={cn(
                    'flex justify-between items-center self-stretch p-5',
                    index !== section.items.length - 1 && 'border-b border-stroke-grey',
                  )}
                >
                  {/* Info side (right in RTL) */}
                  <div className="flex shrink-0 items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-main-15">
                      <Icon className="h-5 w-5 text-primary-300" />
                    </div>
                    <div className="flex flex-col shrink-0 items-start gap-2">
                      <span className="text-base font-alyamama text-[#243245]">{item.label}</span>
                      <span className="text-sm font-alyamama text-grey-500">{item.subtitle}</span>
                    </div>
                  </div>

                  {/* Button side (left in RTL) */}
                  <button
                    type="button"
                    onClick={() =>
                      setActiveView({ section: section.title, item: item.id, label: item.label })
                    }
                    className="flex shrink-0 items-center bg-primary-main-15 text-primary-300 py-[3px] px-6 rounded-lg border border-solid border-white text-base font-bold font-alyamama transition-colors hover:bg-primary-main-20 cursor-pointer"
                  >
                    {item.buttonText}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export default SecuritySection
