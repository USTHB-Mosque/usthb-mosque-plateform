'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

export default function AdminRouteGuard({
  role,
  children,
}: {
  role?: string
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (role !== 'librarian') return
    const allowed = pathname.startsWith('/admin-panel/library')
    if (!allowed) router.replace('/admin-panel/library')
  }, [pathname, role, router])

  return <>{children}</>
}
