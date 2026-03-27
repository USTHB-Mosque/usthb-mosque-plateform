'use client'

import React, { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { BookOpenCheck, Languages, Tag } from 'lucide-react'
import ListingFiltersGroup, { ListingFilter } from './ListingFiltersGroup'
import { Separator } from '@/components/ui/separator'
import {
  ListingAvailabilityProps,
  ListingFiltersProps,
  ListingLanguageProps,
} from './ListingToolbar'

interface ListingFiltersDialogProps {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  filtersProps?: ListingFiltersProps
  languageProps?: ListingLanguageProps
  availabilityProps?: ListingAvailabilityProps
  /** Called after filters are committed (e.g. reset pagination). */
  onApplyFilters?: () => void
}

const ListingFiltersDialog: React.FC<ListingFiltersDialogProps> = ({
  isOpen,
  setIsOpen,
  filtersProps,
  languageProps,
  availabilityProps,
  onApplyFilters,
}) => {
  const [draftTypes, setDraftTypes] = useState<string[]>([])
  const [draftLanguages, setDraftLanguages] = useState<string[]>([])
  const [draftAvailability, setDraftAvailability] = useState<string>('all')

  useEffect(() => {
    if (!isOpen) return
    setDraftTypes(filtersProps?.enabled ? (filtersProps.values ?? []) : [])
    setDraftLanguages(languageProps?.enabled ? (languageProps.values ?? []) : [])
    setDraftAvailability(availabilityProps?.enabled ? (availabilityProps.value ?? 'all') : 'all')
  }, [isOpen])

  const handleResetDraft = () => {
    if (filtersProps?.enabled) setDraftTypes([])
    if (languageProps?.enabled) setDraftLanguages([])
    if (availabilityProps?.enabled) setDraftAvailability('all')
  }

  const handleApply = () => {
    if (filtersProps?.enabled) {
      filtersProps.onChange(draftTypes)
    }
    if (languageProps?.enabled) {
      languageProps.onChange(draftLanguages)
    }
    if (availabilityProps?.enabled) {
      availabilityProps.onChange(draftAvailability)
    }
    onApplyFilters?.()
    setIsOpen(false)
  }

  const showReset =
    Boolean(filtersProps?.enabled) ||
    Boolean(languageProps?.enabled) ||
    Boolean(availabilityProps?.enabled)

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
          {filtersProps?.enabled ? (
            <ListingFiltersGroup
              title="التصنيفات"
              icon={<Tag />}
              options={filtersProps.options}
              values={draftTypes}
              onChange={setDraftTypes}
              multiple
            />
          ) : null}
          {availabilityProps?.enabled ? (
            <ListingFiltersGroup
              title="التوفر"
              icon={<BookOpenCheck />}
              options={availabilityProps.options}
              values={draftAvailability}
              onChange={setDraftAvailability}
              buttonClassName="flex-1"
            />
          ) : null}
          {languageProps?.enabled ? (
            <ListingFiltersGroup
              title="اللغة"
              icon={<Languages />}
              options={languageProps.options}
              values={draftLanguages}
              onChange={setDraftLanguages}
              buttonClassName="flex-1"
            />
          ) : null}
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
