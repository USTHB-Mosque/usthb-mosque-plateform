'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut, PanelRightOpen, PanelRightClose } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { logout } from '@/features/auth/server/logout'
import { toast } from 'sonner'
import {
  adminMainNav,
  adminSecondaryNav,
  adminNavHelpers,
  adminNavForRole,
} from '@/shared/layouts/admin/nav'
import type { AdminNavItem } from '@/shared/layouts/admin/nav'

type AdminSidebarProps = React.PropsWithChildren<{
  userName?: string
  userEmail?: string
  role?: 'admin' | 'librarian'
  /**
   * Counts keyed by a nav item's `href` (#65). Kept out of `nav.ts` on purpose:
   * the nav tree is static, these numbers are read per request, and merging the
   * two would make every screen that imports the nav depend on the database.
   * A missing key — or a zero — renders no badge at all.
   */
  badges?: Record<string, number>
}>

const STORAGE_KEY = 'admin-panel:sidebar-collapsed'

const AdminSidebarContext = React.createContext<{
  collapsed: boolean
  toggle: () => void
  role?: 'admin' | 'librarian'
}>({ collapsed: false, toggle: () => {} })

const AdminSidebarProvider: React.FC<React.PropsWithChildren<{ role?: 'admin' | 'librarian' }>> = ({
  children,
  role,
}) => {
  const [collapsed, setCollapsed] = React.useState(false)

  React.useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === '1') setCollapsed(true)
    } catch {
      /* */
    }
  }, [])

  const toggle = React.useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      } catch {
        /* */
      }
      return next
    })
  }, [])

  return (
    <AdminSidebarContext.Provider value={{ collapsed, toggle, role }}>
      {children}
    </AdminSidebarContext.Provider>
  )
}

export function useAdminSidebar() {
  return React.useContext(AdminSidebarContext)
}

type SideLinkProps = {
  item: AdminNavItem
  active: boolean
  collapsed: boolean
  /** A sub-page: indented beneath its section's own link. */
  nested?: boolean
  /** Pending work on this section, from `badges`. */
  badge?: number
}

/**
 * The number sighted users read at a glance, and the phrase a screen reader
 * announces — a bare "4" beside an icon says nothing about what is waiting.
 * The count itself is `aria-hidden` so the number is not read twice.
 *
 * `size` only varies the type scale; the caller owns placement, because the
 * desktop rail wants the badge pushed to the row's end and the mobile chip row
 * wants it sitting against the label.
 */
const NavBadge: React.FC<{ count: number; label: string; size: string; className?: string }> = ({
  count,
  label,
  size,
  className,
}) => (
  <span
    className={cn(
      'shrink-0 rounded-full px-1.5 py-0.5 font-bold tabular-nums',
      'bg-primary-main-20 text-primary-300',
      size,
      className,
    )}
  >
    <span aria-hidden="true">{count}</span>
    <span className="sr-only">{label}</span>
  </span>
)

const badgeLabelFor = (item: AdminNavItem, count: number) =>
  `${count} ${item.badgeLabel ?? 'عناصر بانتظار القرار'}`

/** A zero count is not worth a badge; a missing one means "we never asked". */
const visibleBadge = (count?: number) => (count && count > 0 ? count : null)

const SideLink: React.FC<SideLinkProps> = ({ item, active, collapsed, nested, badge }) => {
  const Icon = item.icon
  const pending = visibleBadge(badge)
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={cn(
        'flex h-[38px] items-center gap-3 rounded-[10px] text-sm font-medium transition-colors',
        collapsed ? 'justify-center px-0' : nested ? 'pe-3 ps-8' : 'px-3',
        active
          ? 'bg-primary-main-20 text-primary-300 font-bold'
          : 'text-grey-500 hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground',
      )}
    >
      <Icon className={cn('shrink-0', collapsed ? 'size-5' : 'size-[18px]')} />
      {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
      {pending && (
        <NavBadge
          count={pending}
          label={badgeLabelFor(item, pending)}
          size="text-[11px]"
          className="ms-auto"
        />
      )}
    </Link>
  )
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({
  userName,
  userEmail,
  role,
  badges,
  children,
}) => {
  return (
    <AdminSidebarProvider role={role}>
      <SidebarShell userName={userName} userEmail={userEmail} role={role} badges={badges}>
        {children}
      </SidebarShell>
    </AdminSidebarProvider>
  )
}

const SidebarShell: React.FC<AdminSidebarProps> = ({
  userName,
  userEmail,
  role,
  badges,
  children,
}) => {
  const pathname = usePathname()
  const { collapsed, toggle } = useAdminSidebar()
  const { main: mainNav, secondary: secondaryNav } = adminNavForRole(role)

  return (
    <div className="flex h-dvh overflow-hidden">
      <aside
        className={cn(
          'hidden h-full shrink-0 flex-col bg-background-2 transition-[width] duration-200 lg:flex',
          collapsed ? 'w-[80px]' : 'w-[220px]',
        )}
      >
        <div
          className={cn(
            'flex shrink-0 items-center',
            collapsed ? 'h-16 justify-center' : 'h-20 pe-2 ps-5',
          )}
        >
          <Link href="/admin-panel/dashboard" aria-label="لوحة التحكم">
            {collapsed ? (
              <Image
                src="/static/images/logo-icon.svg"
                alt="لوحة التحكم"
                width={32}
                height={40}
                className="h-9 w-auto"
              />
            ) : (
              <Image
                src="/static/images/logo-horizontal.svg"
                alt="لوحة التحكم"
                width={112}
                height={44}
                className="h-10 w-auto"
              />
            )}
          </Link>
        </div>

        <div className={cn('flex flex-col gap-1', collapsed ? 'px-2' : 'ps-4 pe-2')}>
          {!collapsed && (
            <p className="ps-3 pb-1 pt-2 text-[12px] font-medium text-grey-400">القائمة الرئيسية</p>
          )}
          <nav className="flex flex-col gap-1" aria-label="لوحة التحكم">
            {mainNav.map((item) => (
              <div key={item.href} className="flex flex-col gap-1">
                <SideLink
                  item={item}
                  active={adminNavHelpers.isActive(item, pathname)}
                  collapsed={collapsed}
                  badge={badges?.[item.href]}
                />
                {item.children?.map((child) => (
                  <SideLink
                    key={child.href}
                    item={child}
                    active={adminNavHelpers.isActive(child, pathname)}
                    collapsed={collapsed}
                    nested
                  />
                ))}
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-auto flex flex-col gap-3">
          <div className={cn('flex flex-col gap-1', collapsed ? 'px-2' : 'ps-4 pe-2')}>
            {!collapsed && (
              <p className="ps-3 pb-1 pt-2 text-[12px] font-medium text-grey-400">
                القائمة الثانوية
              </p>
            )}
            <nav className="flex flex-col gap-1" aria-label="روابط سريعة">
              {secondaryNav.map((item) => (
                <SideLink
                  key={item.href}
                  item={item}
                  active={adminNavHelpers.isActive(item, pathname)}
                  collapsed={collapsed}
                />
              ))}
            </nav>
          </div>

          <div className={cn('border-t border-border pb-3 pt-3', collapsed ? 'px-2' : 'ps-4 pe-2')}>
            <button
              onClick={toggle}
              className={cn(
                'mb-2 flex h-[38px] w-full items-center gap-3 rounded-[10px] px-3 text-sm font-medium text-grey-500 transition-colors hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground',
                collapsed && 'justify-center px-0',
              )}
              title={collapsed ? 'توسيع' : 'طي'}
            >
              {collapsed ? (
                <PanelRightOpen className="size-5" />
              ) : (
                <PanelRightClose className="size-[18px]" />
              )}
              {!collapsed && <span className="min-w-0 flex-1 truncate text-start">طي القائمة</span>}
            </button>

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
              <div className="rounded-[10px] bg-fill-contrast px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-200 text-sm font-bold text-[#243245]">
                    {userName.trim().charAt(0) || 'م'}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold font-dubai text-foreground">
                      {userName}
                    </p>
                    {userEmail && <p className="truncate text-[11px] text-grey-500">{userEmail}</p>}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </aside>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:bg-background-2">
        <MobileTopbar role={role} badges={badges} />
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</main>
      </div>
    </div>
  )
}

const MobileTopbar: React.FC<{ role?: string; badges?: Record<string, number> }> = ({
  role,
  badges,
}) => {
  const pathname = usePathname()
  const { main: mainNav } = adminNavForRole(role)
  // The horizontal chip row has no room for nesting, so sub-pages are listed
  // as peers here — the sidebar keeps the hierarchy.
  const flatNav = mainNav.flatMap((item) =>
    item.children?.length ? [item, ...item.children] : [item],
  )
  const current =
    flatNav.find((i) => i.href === pathname) ??
    flatNav.find((i) => pathname.startsWith(`${i.href}/`))

  return (
    <header className="sticky top-0 z-40 bg-background-2/95 backdrop-blur lg:hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="overflow-x-auto">
          <nav className="flex gap-2">
            {flatNav.map((item) => {
              const Icon = item.icon
              const active = adminNavHelpers.isActive(item, pathname)
              const pending = visibleBadge(badges?.[item.href])
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                    active
                      ? 'bg-primary-main-15 text-primary-300 font-bold'
                      : 'text-grey-400 hover:bg-muted hover:text-grey-500',
                  )}
                >
                  <Icon className="size-4" />
                  <span>{item.label}</span>
                  {pending && (
                    <NavBadge
                      count={pending}
                      label={badgeLabelFor(item, pending)}
                      size="text-[10px]"
                    />
                  )}
                </Link>
              )
            })}
          </nav>
        </div>
        <span className="ms-auto shrink-0 text-sm font-bold font-dubai">
          {current?.label ?? 'لوحة التحكم'}
        </span>
      </div>
    </header>
  )
}

export default AdminSidebar
