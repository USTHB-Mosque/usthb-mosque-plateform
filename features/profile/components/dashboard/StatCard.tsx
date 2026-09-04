import React from 'react'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: number
  icon: LucideIcon
  href: string
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, href }) => {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-tabs-active"
    >
      <div className="min-w-0">
        <div className="text-2xl font-bold text-card-foreground">{value}</div>
        <div className="mt-0.5 truncate text-sm text-muted-foreground">{label}</div>
      </div>
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-background-2 text-primary-300">
        <Icon className="size-5" aria-hidden />
      </div>
    </Link>
  )
}

export default StatCard