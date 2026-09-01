'use client'

import * as React from 'react'
import { PanelRight, PanelRightOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import DarkModeToggle from '@/components/ui/dark-mode-toggle'
import SearchInput from '@/components/ui/search-input'
import NotificationBell from '@/components/layouts/user/NotificationBell'
import { useUserSidebar } from '@/components/layouts/user/sidebar-context'

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
    <header className="sticky top-0 z-40 -ms-px flex items-center justify-between gap-4 border-b border-border bg-background-2 px-4 py-3 sm:px-6">
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
        <Separator orientation="vertical" className="h-[17px]" />
        <h1 className="text-lg font-bold font-dubai text-[#243245] whitespace-nowrap [direction:rtl]">
          {title}
        </h1>
      </div>

      <SearchInput
        placeholder="اسم الكتاب / المؤلف ..."
        className="max-w-xs flex-1"
        aria-label="البحث عن كتاب أو مؤلف"
      />

      <div className="flex items-center gap-2">
        <DarkModeToggle />
        <NotificationBell />
      </div>
    </header>
  )
}

export default UserPageHeader