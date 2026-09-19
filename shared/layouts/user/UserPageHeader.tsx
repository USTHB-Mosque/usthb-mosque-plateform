'use client'

import * as React from 'react'
import { PanelRight, PanelRightOpen } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Separator } from '@/shared/ui/separator'
import DarkModeToggle from '@/shared/ui/dark-mode-toggle'
import SearchInput from '@/shared/ui/search-input'
import NotificationBell from '@/shared/layouts/user/NotificationBell'
import { useUserSidebar } from '@/shared/layouts/user/sidebar-context'

type UserPageHeaderProps = {
  title: string
  sidebarToggleLabel?: string
  onToggleSidebar?: () => void
}

const UserPageHeader: React.FC<UserPageHeaderProps> = ({
  title,
  sidebarToggleLabel = 'فتح أو إغلاق الشريط الجانبي',
  onToggleSidebar,
}) => {
  const { collapsed, toggle } = useUserSidebar()
  const handleToggle = onToggleSidebar ?? toggle

  return (
    <header className="sticky top-0 z-40 hidden items-center justify-between gap-4 bg-background-2 px-4 py-3 sm:px-6 lg:flex">
      <div className="flex min-w-0 items-center gap-2">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label={sidebarToggleLabel}
          onClick={handleToggle}
          className="hidden lg:inline-flex"
        >
          {collapsed ? <PanelRightOpen className="size-5" /> : <PanelRight className="size-5" />}
        </Button>
        <Separator orientation="vertical" className="hidden h-[17px] lg:block" />
        <h1 className="hidden text-lg font-bold font-dubai text-[#243245] whitespace-nowrap [direction:rtl] lg:block">
          {title}
        </h1>
      </div>

      <SearchInput
        placeholder="اسم الكتاب / المؤلف ..."
        className="hidden max-w-xs flex-1 lg:flex"
        aria-label="البحث عن كتاب أو مؤلف"
      />

      <div className="hidden items-center gap-2 lg:flex">
        <DarkModeToggle />
        <NotificationBell />
      </div>
    </header>
  )
}

export default UserPageHeader
