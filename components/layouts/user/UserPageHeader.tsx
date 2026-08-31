'use client'

import * as React from 'react'
import { PanelRightOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import DarkModeToggle from '@/components/ui/dark-mode-toggle'
import SearchInput from '@/components/ui/search-input'
import NotificationBell from '@/components/layouts/user/NotificationBell'

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
  return (
    <header className="flex items-center justify-between gap-4 border-b border-border bg-card/60 px-4 py-3 backdrop-blur sm:px-6">
      <div className="flex items-center gap-2">
        <DarkModeToggle />
        <NotificationBell />
      </div>

      <SearchInput
        placeholder="اسم الكتاب / المؤلف ..."
        className="max-w-xs flex-1"
        aria-label="البحث عن كتاب أو مؤلف"
      />

      <div className="flex items-center gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-bold font-dubai text-primary-300 whitespace-nowrap [direction:rtl]">
            {title}
          </h1>
        </div>
        <Separator orientation="vertical" className="h-[17px]" />
        {onToggleSidebar ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={sidebarToggleLabel}
            onClick={onToggleSidebar}
          >
            <PanelRightOpen className="size-5" />
          </Button>
        ) : null}
      </div>
    </header>
  )
}

export default UserPageHeader
