'use client'

import * as React from 'react'
import { PanelRight, PanelRightOpen } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import DarkModeToggle from '@/shared/ui/dark-mode-toggle'
import { Separator } from '@/shared/ui/separator'
import { useAdminSidebar } from '@/shared/layouts/admin/AdminSidebar'
import { NotificationBell } from '@/features/notifications'

type AdminPageHeaderProps = {
  title: string
}

const AdminPageHeader: React.FC<AdminPageHeaderProps> = ({ title }) => {
  const { collapsed, toggle, role } = useAdminSidebar()

  return (
    <header className="sticky top-0 z-40 flex items-center gap-4 bg-background-2 px-4 py-3 sm:px-6">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label="فتح أو إغلاق الشريط الجانبي"
        onClick={toggle}
        className="hidden lg:inline-flex"
      >
        {collapsed ? <PanelRightOpen className="size-5" /> : <PanelRight className="size-5" />}
      </Button>
      <Separator orientation="vertical" className="h-[17px]" />
      <h1 className="text-lg font-bold font-dubai text-foreground whitespace-nowrap [direction:rtl]">
        {title}
      </h1>
      <div className="ms-auto flex items-center gap-2">
        <DarkModeToggle />
        {role === 'admin' ? <NotificationBell inboxHref="/admin-panel/updates" /> : null}
      </div>
    </header>
  )
}

export default AdminPageHeader
