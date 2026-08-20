'use client'

import React from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Link
        href="/"
        aria-label="العودة للرئيسية"
        className="group/back fixed top-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 shadow-md backdrop-blur transition-colors hover:bg-white"
      >
        <X className="h-5 w-5 text-gray-700 transition-colors group-hover/back:text-primary" />
      </Link>
      {children}
    </>
  )
}