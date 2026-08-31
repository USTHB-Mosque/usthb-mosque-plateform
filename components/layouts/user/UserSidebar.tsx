'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { logout } from '@/actions/auth/logout'
import { toast } from 'sonner'
import { userMainNav, userSecondaryNav, userNavHelpers } from '@/components/layouts/user/nav'

type UserSidebarProps = React.PropsWithChildren<{
  userName?: string
  userEmail?: string
}>

const UserSidebar: React.FC<UserSidebarProps> = ({ children, userName, userEmail }) => {
  const pathname = usePathname()

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 h-screen w-64 shrink-0 border-e border-border bg-background-2/60 p-4 hidden lg:flex flex-col">
        <Link href="/" className="mb-6 flex items-center gap-2 px-3 pt-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
            <LayoutDashboard className="size-5 text-primary" />
          </span>
          <span className="text-lg font-bold font-dubai text-foreground">بوابة العضو</span>
        </Link>

        <nav className="flex flex-col gap-1" aria-label="أقسام المنصة">
          {userMainNav.map((item) => {
            const Icon = item.icon
            const active = userNavHelpers.isActive(item, pathname)
            return (
              <NavItem key={item.href} item={item} active={active} icon={<Icon className="size-[18px] shrink-0" />} />
            )
          })}
        </nav>

        <div className="mt-auto space-y-1">
          <nav className="flex flex-col gap-1 border-t border-border pt-3" aria-label="روابط إضافية">
            {userSecondaryNav.map((item) => {
              const Icon = item.icon
              const active = userNavHelpers.isActive(item, pathname)
              return (
                <NavItem key={item.href} item={item} active={active} icon={<Icon className="size-[18px] shrink-0" />} />
              )
            })}
          </nav>

          <div className="border-t border-border pt-3 space-y-1">
            {userName ? (
              <div className="px-3 py-2">
                <p className="text-sm font-bold font-dubai truncate">{userName}</p>
                {userEmail ? (
                  <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                ) : null}
              </div>
            ) : null}
            <SidebarLogout />
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <MobileTopbar />
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  )
}

const NavItem: React.FC<{ item: (typeof userMainNav)[number]; active: boolean; icon: React.ReactNode }> = ({
  item,
  active,
  icon,
}) => {
  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
        active ? 'bg-primary-200 text-blue-400' : 'text-grey-400 hover:bg-muted hover:text-grey-500',
      )}
    >
      {icon}
      <span>{item.label}</span>
    </Link>
  )
}

const SidebarLogout: React.FC = () => {
  const router = useRouter()

  const onLogout = async () => {
    await logout()
    localStorage.removeItem('access_token')
    toast.success('تم تسجيل الخروج بنجاح')
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <button
      onClick={onLogout}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
    >
      <LogOut className="size-[18px] shrink-0" />
      <span>تسجيل الخروج</span>
    </button>
  )
}

const MobileTopbar: React.FC = () => {
  const pathname = usePathname()
  const current = userMainNav.find((i) => userNavHelpers.isActive(i, pathname))

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur lg:hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="overflow-x-auto">
          <nav className="flex gap-2">
            {userMainNav.map((item) => {
              const Icon = item.icon
              const active = userNavHelpers.isActive(item, pathname)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                    active ? 'bg-primary-200 text-blue-400' : 'text-grey-400 hover:bg-muted hover:text-grey-500',
                  )}
                >
                  <Icon className="size-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
            <SidebarLogoutCompact />
          </nav>
        </div>
        <span className="ms-auto shrink-0 text-sm font-bold font-dubai">
          {current?.label ?? 'بوابة العضو'}
        </span>
      </div>
    </header>
  )
}

const SidebarLogoutCompact: React.FC = () => {
  const router = useRouter()

  const onLogout = async () => {
    await logout()
    localStorage.removeItem('access_token')
    toast.success('تم تسجيل الخروج بنجاح')
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <button
      onClick={onLogout}
      aria-label="تسجيل الخروج"
      className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
    >
      <LogOut className="size-4" />
    </button>
  )
}

export default UserSidebar
