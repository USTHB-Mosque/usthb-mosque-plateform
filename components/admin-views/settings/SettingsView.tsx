import React from 'react'
import type { User } from '@/payload-types'
import SettingsProfileCard, {
  type SettingsTab,
} from '@/features/profile/components/settings/SettingsProfileCard'

type SettingsViewProps = React.PropsWithChildren<{
  user: User
  activeTab: SettingsTab
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
        // #156: loan configuration is admin-only; the member portal has no such
        // screen, so the tab is offered here and not there.
        availableTabs={['info', 'security', 'notifications', 'loans']}
      />
      {children}
    </div>
  )
}

export default SettingsView
