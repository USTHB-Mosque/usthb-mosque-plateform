import React from 'react'
import type { User } from '@/payload-types'
import SettingsProfileCard from '@/features/profile/components/settings/SettingsProfileCard'

type SettingsViewProps = React.PropsWithChildren<{
  user: User
  activeTab: 'info' | 'security' | 'notifications' | 'shortcuts'
}>

const SettingsView: React.FC<SettingsViewProps> = ({ user, activeTab, children }) => {
  return (
    <div
      dir="rtl"
      className="flex w-full flex-1 flex-col overflow-hidden rounded-xl border border-stroke-grey bg-background lg:border-0 lg:flex-row lg:items-start lg:gap-[33px]"
    >
      <SettingsProfileCard
        user={user}
        activeTab={activeTab}
        hrefBase="/admin-panel/settings"
        hideDeleteAccount
      />
      {children}
    </div>
  )
}

export default SettingsView
