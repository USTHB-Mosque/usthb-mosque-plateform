import React from 'react'
import type { LucideIcon } from 'lucide-react'

export interface StatKpi {
  label: string
  value: number | string
  icon: LucideIcon
}

interface StatCardsProps {
  items: StatKpi[]
}

const StatCards: React.FC<StatCardsProps> = ({ items }) => {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((stat) => {
        const Icon = stat.icon
        return (
          <div
            key={stat.label}
            className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"
          >
            <div className="min-w-0">
              <div className="text-2xl font-bold text-card-foreground">{stat.value}</div>
              <div className="mt-0.5 truncate text-sm text-muted-foreground">{stat.label}</div>
            </div>
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-background-2 text-primary-300">
              <Icon className="size-5" aria-hidden />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default StatCards
