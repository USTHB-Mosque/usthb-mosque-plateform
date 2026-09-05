import {
  ClipboardList,
  CalendarDays,
  CalendarCheck,
  Clock,
  Newspaper,
  LayoutDashboard,
  LibraryBig,
  ScrollText,
  Settings,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type UserNavItem = {
  label: string
  href: string
  icon: LucideIcon
  /** Optional teal count badge (matching the design's notification_number) */
  badge?: number | string
  /** Non-hasMany groups still use simple path checks */
  match?: string
}

export const userMainNav: UserNavItem[] = [
  { label: 'الرئيسية', href: '/user/dashboard', icon: LayoutDashboard },
  { label: 'الكتب', href: '/user/library', icon: LibraryBig },
  { label: 'الإعارات', href: '/user/my-loans', icon: ClipboardList },
  { label: 'المقالات', href: '/user/articles', icon: Newspaper },
  { label: 'الأنشطة', href: '/user/activities', icon: CalendarDays },
  { label: 'تسجيلاتي', href: '/user/my-registrations', icon: CalendarCheck },
]

export const userSecondaryNav: UserNavItem[] = [
  { label: 'آخر التحديثات', href: '/user/latest-updates', icon: Clock },
  { label: 'سجل الأحداث', href: '/user/activity-log', icon: ScrollText },
  { label: 'الإعدادات', href: '/user/settings', icon: Settings },
]

export const userNavHelpers = {
  isActive: (item: UserNavItem, pathname: string) => {
    const match = item.match ?? item.href
    return pathname === match || pathname.startsWith(`${match}/`)
  },
}