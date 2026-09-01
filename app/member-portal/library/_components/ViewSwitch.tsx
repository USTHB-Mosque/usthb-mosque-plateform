'use client'

import React from 'react'
import { LayoutGrid, List } from 'lucide-react'
import { cn } from '@/lib/utils'

export type CatalogView = 'grid' | 'table'

type ViewSwitchProps = {
  view: CatalogView
  onViewChange: (view: CatalogView) => void
}

const ViewSwitch: React.FC<ViewSwitchProps> = ({ view, onViewChange }) => {
  return (
    <div className="flex h-10 shrink-0 items-center gap-1 rounded-lg bg-background-2 p-1">
      <SwitchButton
        active={view === 'grid'}
        label="عرض شبكة"
        icon={<LayoutGrid className="size-5" />}
        onClick={() => onViewChange('grid')}
      />
      <SwitchButton
        active={view === 'table'}
        label="عرض جدول"
        icon={<List className="size-5" />}
        onClick={() => onViewChange('table')}
      />
    </div>
  )
}

const SwitchButton: React.FC<{
  active: boolean
  label: string
  icon: React.ReactNode
  onClick: () => void
}> = ({ active, label, icon, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={cn(
        'flex h-8 w-9 items-center justify-center rounded-[6px] transition-colors',
        active ? 'bg-primary-200 text-[#243245]' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {icon}
    </button>
  )
}

export default ViewSwitch