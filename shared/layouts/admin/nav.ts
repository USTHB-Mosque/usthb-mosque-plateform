import {
  LayoutDashboard,
  Users,
  LibraryBig,
  BookOpen,
  CreditCard,
  ListOrdered,
  CalendarClock,
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
  /**
   * What this section's badge counts, in Arabic, for the screen-reader
   * announcement (`<count> <badgeLabel>`). The count itself is not here — it
   * is read per request and passed to the sidebar as `badges`, keyed by href.
   * Sits next to the item so the wording lives with the section it describes.
   */
  badgeLabel?: string
  /** Sub-pages of this section, rendered nested beneath it in the sidebar. */
  children?: AdminNavItem[]
}

export const adminMainNav: AdminNavItem[] = [
  { label: 'لوحة التحكم', href: '/admin-panel/dashboard', icon: LayoutDashboard },
  { label: 'المستخدمون', href: '/admin-panel/users', icon: Users },
  { label: 'المكتبة', href: '/admin-panel/library', icon: LibraryBig },
  { label: 'البطاقات', href: '/admin-panel/cards', icon: CreditCard },
  {
    label: 'الإعارات',
    href: '/admin-panel/loans',
    icon: BookOpen,
    badgeLabel: 'إعارات بانتظار الموافقة',
    children: [
      { label: 'قائمة الانتظار', href: '/admin-panel/loans/waitlist', icon: ListOrdered },
      { label: 'طلبات التمديد', href: '/admin-panel/loans/extensions', icon: CalendarClock },
    ],
  },
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
    // A section with sub-pages only lights up on its own default page, so the
    // current sub-page is the single highlighted row rather than both.
    if (item.children?.length) return pathname === item.href
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
