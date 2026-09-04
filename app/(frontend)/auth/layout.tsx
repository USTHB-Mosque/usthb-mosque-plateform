import React from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { X } from 'lucide-react'
import { getAuthenticatedUser } from '@/lib/auth'

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getAuthenticatedUser({ allowAdmin: true })
  if (user) redirect(user.role === 'admin' ? '/admin' : '/user/dashboard')

  return (
    <>
      <Link
        href="/"
        aria-label="العودة للرئيسية"
        className="group/back fixed top-4 end-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 shadow-md backdrop-blur transition-colors hover:bg-white"
      >
        <X className="h-5 w-5 text-gray-700 transition-colors group-hover/back:text-primary" />
      </Link>
      {children}
    </>
  )
}
