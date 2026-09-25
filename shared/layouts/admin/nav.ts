import {
  LayoutDashboard,
  Users,
  LibraryBig,
  BookOpen,
  FileText,
  CalendarDays,
  MessageSquareQuote,
  BarChart3,
  RefreshCw,
  ScrollText,
  Settings,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type AdminNavItem = {
  label: string
  href: string
  icon: LucideIcon
  badge?: number | string
}

export const adminMainNav: AdminNavItem[] = [
  { label: 'لوحة التحكم', href: '/admin-panel/dashboard', icon: LayoutDashboard },
  { label: 'المستخدمون', href: '/admin-panel/users', icon: Users },
  { label: 'المكتبة', href: '/admin-panel/library', icon: LibraryBig },
  { label: 'الإعارات', href: '/admin-panel/loans', icon: BookOpen },
  { label: 'المقالات', href: '/admin-panel/articles', icon: FileText },
  { label: 'الأنشطة', href: '/admin-panel/activities', icon: CalendarDays },
  { label: 'آراء القرّاء', href: '/admin-panel/reviews', icon: MessageSquareQuote },
  { label: 'الإحصائيات', href: '/admin-panel/stats', icon: BarChart3 },
]

export const adminSecondaryNav: AdminNavItem[] = [
  { label: 'آخر التحديثات', href: '/admin-panel/updates', icon: RefreshCw },
  { label: 'سجل الأحداث', href: '/admin-panel/activity-log', icon: ScrollText },
  { label: 'الإعدادات', href: '/admin-panel/settings', icon: Settings },
]

export const adminNavHelpers = {
  isActive: (item: AdminNavItem, pathname: string) => {
    return pathname === item.href || pathname.startsWith(`${item.href}/`)
  },
}

export function adminNavForRole(role?: string) {
  if (role === 'librarian') {
    return {
      main: adminMainNav.filter((item) => item.href.startsWith('/admin-panel/library')),
      secondary: [],
    }
  }
  return { main: adminMainNav, secondary: adminSecondaryNav }
}
