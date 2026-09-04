'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { logout } from '@/actions/auth/logout'
import { toast } from 'sonner'
import {
  userMainNav,
  userSecondaryNav,
  userNavHelpers,
  type UserNavItem,
} from '@/components/layouts/user/nav'
import { UserSidebarProvider, useUserSidebar } from '@/components/layouts/user/sidebar-context'

type UserSidebarProps = React.PropsWithChildren<{
  userName?: string
  userEmail?: string
  loansBadge?: number
}>

const UserSidebar: React.FC<UserSidebarProps> = ({ userName, userEmail, loansBadge, children }) => {
  return (
    <UserSidebarProvider>
      <SidebarShell userName={userName} userEmail={userEmail} loansBadge={loansBadge}>
        {children}
      </SidebarShell>
    </UserSidebarProvider>
  )
}

const SidebarShell: React.FC<UserSidebarProps> = ({ userName, userEmail, loansBadge, children }) => {
  const pathname = usePathname()
  const { collapsed } = useUserSidebar()

  const mainNav = userMainNav.map((item) =>
    item.href === '/user/my-loans' && loansBadge ? { ...item, badge: loansBadge } : item,
  )

  return (
    <div className="flex h-dvh overflow-hidden">
      <aside
        className={cn(
          'hidden h-full shrink-0 flex-col bg-background-2 transition-[width] duration-200 lg:flex',
          collapsed ? 'w-[80px]' : 'w-[220px]',
        )}
      >
        <div className={cn('flex shrink-0 items-center', collapsed ? 'h-16 justify-center' : 'h-20 pe-2 ps-5')}>
          <Link href="/user/dashboard" aria-label="بوابة المستخدم">
            {collapsed ? (
              <Image
                src="/static/images/logo-icon.svg"
                alt="بوابة المستخدم"
                width={32}
                height={40}
                className="h-9 w-auto"
              />
            ) : (
              <Image
                src="/static/images/logo-horizontal.svg"
                alt="بوابة المستخدم"
                width={112}
                height={44}
                className="h-10 w-auto"
              />
            )}
          </Link>
        </div>

        <NavGroup
          title="القائمة الرئيسية"
          items={mainNav}
          pathname={pathname}
          collapsed={collapsed}
        />

        <div className="mt-auto flex flex-col gap-3">
          <NavGroup
            title="القائمة الثانوية"
            items={userSecondaryNav}
            pathname={pathname}
            collapsed={collapsed}
          />

          <div className={cn('border-t border-border pb-3 pt-3', collapsed ? 'px-2' : 'ps-4 pe-2')}>
            {collapsed ? (
              userName ? (
                <div className="flex justify-center">
                  <span
                    title={userName}
                    className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-primary-200 text-sm font-bold text-[#243245]"
                  >
                    {userName.trim().charAt(0) || 'م'}
                  </span>
                </div>
              ) : null
            ) : userName ? (
              <div className="rounded-[10px] bg-[#e8f1f7] px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-200 text-sm font-bold text-[#243245]">
                    {userName.trim().charAt(0) || 'م'}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold font-dubai text-[#243245]">{userName}</p>
                    {userEmail ? (
                      <p className="truncate text-[11px] text-grey-500">{userEmail}</p>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </aside>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:bg-background-2">
        <MobileTopbar />
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</main>
      </div>
    </div>
  )
}

const NavGroup: React.FC<{
  title: string
  items: UserNavItem[]
  pathname: string
  collapsed: boolean
}> = ({ title, items, pathname, collapsed }) => {
  return (
    <div className={cn('flex flex-col gap-1', collapsed ? 'px-2' : 'ps-4 pe-2')}>
      {!collapsed ? (
        <p className="ps-3 pb-1 pt-2 text-[12px] font-medium text-grey-400">{title}</p>
      ) : null}
      <nav className="flex flex-col gap-1" aria-label={title}>
        {items.map((item) => {
          const Icon = item.icon
          const active = userNavHelpers.isActive(item, pathname)
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex h-[38px] items-center gap-3 rounded-[10px] px-3 text-sm font-medium transition-colors',
                collapsed && 'justify-center px-0',
                active
                  ? 'bg-primary-200 text-[#243245]'
                  : 'text-grey-500 hover:bg-black/5 hover:text-[#243245]',
              )}
            >
              <Icon className={cn('shrink-0', collapsed ? 'size-5' : 'size-[18px]')} />
              {!collapsed ? <span className="min-w-0 flex-1 truncate">{item.label}</span> : null}
              {!collapsed && item.badge ? (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-300/15 px-1.5 text-[10px] font-bold text-primary-300">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

const MobileTopbar: React.FC = () => {
  const pathname = usePathname()
  const current = userMainNav.find((i) => userNavHelpers.isActive(i, pathname))

  return (
    <header className="sticky top-0 z-40 bg-background-2/95 backdrop-blur lg:hidden">
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
                    active ? 'bg-primary-200 text-[#243245]' : 'text-grey-400 hover:bg-muted hover:text-grey-500',
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
          {current?.label ?? 'بوابة المستخدم'}
        </span>
      </div>
    </header>
  )
}

const SidebarLogoutCompact: React.FC = () => {
  const router = useRouter()

  const onLogout = async () => {
    await logout()
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