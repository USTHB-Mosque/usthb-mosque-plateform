'use client'

import React, { useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { X, type LucideIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'

const emptySubscribe = () => () => {}
const serverSnapshot = () => false
const clientSnapshot = () => true

export type BulkAction = {
  label: string
  icon: LucideIcon
  onClick: () => void
  variant?: 'default' | 'destructive'
  disabled?: boolean
}

type BulkActionsBarProps = {
  count: number
  itemName: string
  actions: BulkAction[]
  onClear: () => void
  className?: string
}

const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  count,
  itemName,
  actions,
  onClear,
  className,
}) => {
  const mounted = useSyncExternalStore(emptySubscribe, clientSnapshot, serverSnapshot)

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {count > 0 ? (
        <motion.div
          dir="rtl"
          role="group"
          aria-label="إجراءات التحديد"
          initial={{ opacity: 0, y: 24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className={cn(
            'fixed bottom-6 left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-2xl border border-border bg-popover p-2 ps-3 shadow-2xl sm:gap-3 sm:px-4 sm:py-2.5',
            className,
          )}
        >
          <span className="whitespace-nowrap text-sm font-medium text-[#243245]">
            تم تحديد <span className="font-bold text-primary-300">{count}</span> {itemName}
          </span>

          <div className="h-6 w-px shrink-0 bg-border" />

          <div className="flex items-center gap-1.5 sm:gap-2">
            {actions.map((action) => {
              const Icon = action.icon
              return (
                <Button
                  key={action.label}
                  type="button"
                  size="sm"
                  variant={action.variant === 'destructive' ? 'destructive' : 'default'}
                  disabled={action.disabled}
                  onClick={action.onClick}
                  className="h-9 gap-1.5 rounded-xl px-2.5 sm:px-3"
                >
                  <Icon className="size-4" />
                  <span className="hidden sm:inline">{action.label}</span>
                </Button>
              )
            })}
          </div>

          <div className="h-6 w-px shrink-0 bg-border" />

          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="إلغاء التحديد"
            onClick={onClear}
            className="size-9 shrink-0 rounded-xl text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </Button>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}

export default BulkActionsBar
