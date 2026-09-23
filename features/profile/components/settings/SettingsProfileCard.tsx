'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { arDZ } from 'date-fns/locale'
import { Shield, Bell, Keyboard, Trash2, User } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { Media, User as UserType } from '@/payload-types'
import { getImageUrl } from '@/shared/lib/image-utils'
import { cn } from '@/shared/lib/utils'

type SettingsProfileCardProps = {
  user: UserType
  activeTab?: 'info' | 'security' | 'notifications' | 'shortcuts'
}

const tabs = [
  { id: 'info' as const, label: 'المعلومات', icon: User, href: '/user/settings' },
  { id: 'security' as const, label: 'الحماية', icon: Shield, href: '/user/settings/security' },
  {
    id: 'notifications' as const,
    label: 'الإشعارات',
    icon: Bell,
    href: '/user/settings/notifications',
  },
  {
    id: 'shortcuts' as const,
    label: 'اختصارات',
    icon: Keyboard,
    href: '/user/settings/shortcuts',
  },
]

const SettingsProfileCard: React.FC<SettingsProfileCardProps> = ({ user, activeTab = 'info' }) => {
  const router = useRouter()
  const profileMedia = user.profilePicture as Media | undefined
  const avatarUrl = getImageUrl(profileMedia?.url)
  const displayName = user.fullName || user.email || 'مستخدم'
  const createdAt = user.createdAt
    ? format(new Date(user.createdAt), 'dd/MM/yyyy', { locale: arDZ })
    : 'غير محدد'

  return (
    <div
      dir="rtl"
      className="flex w-full flex-none flex-col overflow-hidden rounded-xl bg-background lg:w-72 lg:border lg:border-solid lg:border-stroke-grey"
    >
      {/* Banner */}
      <div className="relative flex w-full flex-col items-start">
        <div
          className="flex h-[120px] w-full items-center justify-center rounded-t-xl"
          style={{
            backgroundColor: '#0DE9C333',
            backgroundImage: 'url(/static/images/book-pattern.png)',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
        {/* Avatar */}
        <div className="absolute bottom-[-56px] left-1/2 -translate-x-1/2 lg:left-auto lg:translate-x-0 lg:start-7">
          <div className="relative h-[112px] w-[112px] overflow-hidden rounded-[7px] border-4 border-fill-main bg-fill-contrast shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={displayName}
                fill
                className="object-cover"
                sizes="112px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-primary-main-15">
                <span className="text-2xl font-bold text-primary-300 font-khalid">
                  {displayName.charAt(0)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-col gap-6 pt-[68px] pb-6">
        <div className="flex flex-col items-center gap-3 px-6 lg:items-start">
          <span className="text-center text-2xl font-khalid text-[#243245] lg:text-start">
            {displayName}
          </span>
          <span className="text-center text-sm font-alyamama text-grey-500 lg:text-start">
            تاريخ إنشاء الحساب: {createdAt}
          </span>
        </div>

        {/* Tabs (mobile) */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            const tab = tabs.find((t) => t.id === value)
            if (tab) router.push(tab.href)
          }}
          className="w-fit self-center lg:hidden"
        >
          <TabsList className="w-fit flex-wrap overflow-x-auto rounded-[8px] gap-3 group-data-horizontal/tabs:h-auto group-data-horizontal/tabs:flex-row">
            {tabs.map((tab) => {
              return (
                <TabsTrigger key={tab.id} value={tab.id} className="gap-1 px-2 text-[10px]">
                  <span>{tab.label}</span>
                </TabsTrigger>
              )
            })}
          </TabsList>
        </Tabs>

        {/* Tabs (desktop) */}
        <nav className="hidden flex-col gap-1 items-stretch lg:flex" aria-label="أقسام الإعدادات">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={cn(
                  'flex items-center gap-2 py-2 pe-3 ps-3 text-sm font-alyamama transition-colors rounded-[10px] mx-2',
                  isActive
                    ? 'bg-primary-main-20 text-primary-300 font-bold'
                    : 'text-[#243245] hover:bg-black/5',
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{tab.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Divider */}
        <div className="mx-6 hidden h-px rounded-[5px] bg-stroke-grey lg:block" />

        {/* Delete Account */}
        <div className="hidden flex-col items-stretch lg:flex">
          <button
            type="button"
            className="flex items-center gap-1.5 py-2 pe-3 ps-3 text-sm font-alyamama text-destructive transition-colors hover:bg-destructive/10 rounded-[10px] mx-2"
          >
            <Trash2 className="h-[18px] w-[18px]" aria-hidden="true" />
            <span>حذف الحساب</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default SettingsProfileCard
