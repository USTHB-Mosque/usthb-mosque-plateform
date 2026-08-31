import {
  ClipboardList,
  CalendarDays,
  Heart,
  Settings,
  User,
  LayoutDashboard,
  LibraryBig,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type UserNavItem = {
  label: string
  href: string
  icon: LucideIcon
  /** Non-hasMany groups still use simple path checks */
  match?: string
}

export const userMainNav: UserNavItem[] = [
  { label: 'الملف الشخصي', href: '/user/profile', icon: User },
  { label: 'المفضلة', href: '/user/bookmarks', icon: Heart },
  { label: 'إعاراتي', href: '/user/my-loans', icon: ClipboardList },
  { label: 'أنشطتي', href: '/user/my-activities', icon: CalendarDays },
  { label: 'الإعدادات', href: '/user/settings', icon: Settings },
]

export const userSecondaryNav: UserNavItem[] = [
  { label: 'فهرس الكتب', href: '/library', icon: LibraryBig },
  { label: 'بوابة العضو', href: '/user/profile', icon: LayoutDashboard },
]

export const userNavHelpers = {
  isActive: (item: UserNavItem, pathname: string) => {
    const match = item.match ?? item.href
    return pathname === match || pathname.startsWith(`${match}/`)
  },
}
