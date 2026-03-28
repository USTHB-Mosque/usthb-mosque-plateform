'use client'

import React, { useLayoutEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import ListingFiltersGroup from './ListingFiltersGroup'
import { Separator } from '@/components/ui/separator'
import type { ListingFilterSection } from './listing-filter.types'

function cloneDraftFromSections(sections: ListingFilterSection[]): Record<string, string | string[]> {
  const d: Record<string, string | string[]> = {}
  for (const s of sections) {
    if (s.multiple) {
      d[s.id] = Array.isArray(s.value) ? [...s.value] : []
    } else {
      d[s.id] = typeof s.value === 'string' ? s.value : ''
    }
  }
  return d
}

function resetDraftFromSections(sections: ListingFilterSection[]): Record<string, string | string[]> {
  const d: Record<string, string | string[]> = {}
  for (const s of sections) {
    if (s.resetValue !== undefined) {
      d[s.id] = Array.isArray(s.resetValue) ? [...s.resetValue] : s.resetValue
      continue
    }
    if (s.multiple) {
      d[s.id] = []
    } else {
      const all = s.options.find((o) => o.value === 'all')
      d[s.id] = all?.value ?? s.options[0]?.value ?? ''
    }
  }
  return d
}

interface ListingFiltersDialogProps {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  sections: ListingFilterSection[]
  onApplyFilters?: () => void
}

const ListingFiltersDialog: React.FC<ListingFiltersDialogProps> = ({
  isOpen,
  setIsOpen,
  sections,
  onApplyFilters,
}) => {
  const [draft, setDraft] = useState<Record<string, string | string[]>>({})

  useLayoutEffect(() => {
    if (!isOpen) return
    setDraft(cloneDraftFromSections(sections))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- draft sync only when dialog opens
  }, [isOpen])

  const setSectionDraft = (id: string, value: string | string[]) => {
    setDraft((prev) => ({ ...prev, [id]: value }))
  }

  const handleResetDraft = () => {
    setDraft(resetDraftFromSections(sections))
  }

  const handleApply = () => {
    for (const s of sections) {
      const v = draft[s.id]
      if (v === undefined) continue
      s.onChange(v)
    }
    onApplyFilters?.()
    setIsOpen(false)
  }

  const showReset = sections.length > 0

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent showCloseButton={false} className="max-w-3xl">
        <DialogHeader>
          <div className="flex justify-between">
            <p className="text-2xl font-bold">خيارات التصفية</p>
            {showReset ? (
              <Button
                variant="outline"
                className="border border-primary text-primary"
                type="button"
                onClick={handleResetDraft}
              >
                إعادة تعيين
              </Button>
            ) : null}
          </div>
        </DialogHeader>
        <Separator />
        <div className="flex flex-col gap-10">
          {sections.map((s) => {
            const value = draft[s.id]
            if (value === undefined) return null
            return (
              <ListingFiltersGroup
                key={s.id}
                title={s.title}
                icon={s.icon}
                options={s.options}
                values={value}
                onChange={(next) => setSectionDraft(s.id, next)}
                multiple={s.multiple}
                buttonClassName={s.buttonClassName}
              />
            )
          })}
        </div>
        <Separator />

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" className="border border-primary text-primary" type="button">
              إلغاء
            </Button>
          </DialogClose>
          <Button type="button" className="text-foreground" onClick={handleApply}>
            تطبيق التصفية
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ListingFiltersDialog
