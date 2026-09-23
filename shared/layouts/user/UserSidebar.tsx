'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import {
  userMainNav,
  userSecondaryNav,
  userNavHelpers,
  type UserNavItem,
} from '@/shared/layouts/user/nav'
import { UserSidebarProvider, useUserSidebar } from '@/shared/layouts/user/sidebar-context'
import NotificationBell from '@/shared/layouts/user/NotificationBell'
import ThemeSwitcher from '@/shared/ui/theme-switcher'
import { motion } from 'motion/react'
import type { Variants } from 'motion/react'

const drawerContainerVariants: Variants = {
  open: { transition: { staggerChildren: 0.06 } },
  closed: { transition: { staggerChildren: 0.02 } },
}

const drawerSectionVariants: Variants = {
  open: { opacity: 1, y: 0, transition: { staggerChildren: 0.05 } },
  closed: { opacity: 0, y: 16 },
}

const drawerItemVariants: Variants = {
  open: { opacity: 1, y: 0 },
  closed: { opacity: 0, y: 16 },
}

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

const SidebarShell: React.FC<UserSidebarProps> = ({
  userName,
  userEmail,
  loansBadge,
  children,
}) => {
  const pathname = usePathname()
  const { collapsed } = useUserSidebar()

  const mainNav = userMainNav.map((item) =>
    item.href === '/user/my-loans' && loansBadge ? { ...item, badge: loansBadge } : item,
  )

  return (
    <div className="flex h-dvh overflow-hidden">
      <aside
        className={cn(
          'hidden h-full shrink-0 flex-col bg-background-2 transition-[width] duration-200 md:flex',
          collapsed ? 'w-[80px]' : 'w-[220px]',
        )}
      >
        <div
          className={cn(
            'flex h-20 shrink-0 items-center',
            collapsed ? 'justify-center' : 'pe-2 ps-5',
          )}
        >
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

          <div className={cn('border-t border-border pb-3 pt-3', collapsed ? 'ps-2' : 'ps-4 pe-2')}>
            {userName ? (
              <div
                className={cn(
                  'flex h-[56px] items-center rounded-[10px] bg-[#e8f1f7]',
                  collapsed ? 'justify-center px-0' : 'px-3',
                )}
              >
                <span
                  title={userName}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-200 text-sm font-bold text-[#243245]"
                >
                  {userName.trim().charAt(0) || 'م'}
                </span>
                {!collapsed ? (
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold font-dubai text-[#243245]">
                      {userName}
                    </p>
                    {userEmail ? (
                      <p className="truncate text-[11px] text-grey-500">{userEmail}</p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </aside>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:bg-background-2">
        <MobileNavigation mainNav={mainNav} userName={userName} userEmail={userEmail} />
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
  onNavigate?: () => void
  animated?: boolean
  hideTitle?: boolean
}> = ({ title, items, pathname, collapsed, onNavigate, animated = false, hideTitle = false }) => {
  return (
    <div className={cn('flex flex-col gap-1', collapsed ? 'ps-2' : 'ps-4 pe-2')}>
      <p
        className={cn(
          'truncate ps-3 pb-1 pt-2 text-[12px] font-medium text-grey-400',
          (collapsed || hideTitle) && 'invisible',
        )}
      >
        {title}
      </p>
      <nav className="flex flex-col gap-1" aria-label={title}>
        {items.map((item) => {
          const Icon = item.icon
          const active = userNavHelpers.isActive(item, pathname)
          const link = (
            <Link
              href={item.href}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex h-[38px] items-center gap-3 rounded-[10px] px-3 text-sm font-medium transition-colors',
                collapsed && 'justify-center px-0',
                active
                  ? 'bg-primary-main-20 text-primary-300 font-bold'
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

          if (!animated) {
            return <div key={item.href}>{link}</div>
          }

          return (
            <motion.div key={item.href} variants={drawerItemVariants}>
              {link}
            </motion.div>
          )
        })}
      </nav>
    </div>
  )
}

const MobileNavigation: React.FC<{
  mainNav: UserNavItem[]
  userName?: string
  userEmail?: string
}> = ({ mainNav, userName, userEmail }) => {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const close = () => setOpen(false)

  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [open])

  return (
    <div className="relative z-50 md:hidden">
      <header
        dir="ltr"
        className="sticky top-0 z-50 flex shrink-0 items-center justify-between bg-background-2/95 px-8 py-2 backdrop-blur"
      >
        <Link href="/user/dashboard" aria-label="بوابة المستخدم" className="shrink-0">
          <Image
            src="/static/images/logo-icon.svg"
            alt="بوابة المستخدم"
            width={32}
            height={40}
            className="h-10 w-auto"
          />
        </Link>

        <button
          aria-label={open ? 'إغلاق القائمة' : 'فتح القائمة'}
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
          className="rounded-md p-2 text-foreground transition-colors hover:bg-muted"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      <div
        aria-hidden={!open}
        className={cn(
          'fixed inset-x-0 bottom-0 top-14 z-40 border-t border-border bg-background-2 transition-opacity duration-300',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
        <motion.nav
          initial="closed"
          animate={open ? 'open' : 'closed'}
          variants={drawerContainerVariants}
          className="flex h-full flex-col justify-between overflow-y-auto px-4 pb-6 pt-4"
          aria-label="قائمة المستخدم"
        >
          <motion.div variants={drawerSectionVariants}>
            <NavGroup
              animated
              title="القائمة الرئيسية"
              items={mainNav}
              pathname={pathname}
              collapsed={false}
              onNavigate={close}
            />
          </motion.div>

          <motion.div variants={drawerSectionVariants} className="mt-6 border-t pt-3">
            <NavGroup
              animated
              title="القائمة الثانوية"
              items={userSecondaryNav}
              pathname={pathname}
              collapsed={false}
              onNavigate={close}
            />
            <div className="ms-4 me-2 mt-1">
              <NotificationBell sidebar />
            </div>
          </motion.div>

          <motion.div variants={drawerSectionVariants} className="mt-auto flex flex-col gap-3 pt-4">
            <ThemeSwitcher />
            {userName ? (
              <div className="rounded-[10px] bg-[#e8f1f7] px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-200 text-sm font-bold text-[#243245]">
                    {userName.trim().charAt(0) || 'م'}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold font-dubai text-[#243245]">
                      {userName}
                    </p>
                    {userEmail ? (
                      <p className="truncate text-[11px] text-grey-500">{userEmail}</p>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </motion.div>
        </motion.nav>
      </div>
    </div>
  )
}

export default UserSidebar
