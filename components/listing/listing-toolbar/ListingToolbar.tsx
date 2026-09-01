'use client'

import React, { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Funnel } from 'lucide-react'
import ListingFiltersDialog from './ListingFiltersDialog'
import ListingFiltersGroup from './ListingFiltersGroup'
import { listingFilterSectionsVisible, type ListingFilterSection } from './listing-filter.types'
import { cn } from '@/lib/utils'

export type { ListingFilterSection } from './listing-filter.types'

export interface ListingSearchProps {
  enabled?: boolean
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export interface ListingToolbarProps {
  searchProps?: ListingSearchProps
  filterSections?: ListingFilterSection[]
  onApplyFilters?: () => void
  quickFilterIds?: string[]
  quickFilterSections?: ListingFilterSection[]
  /** Rendered next to the search input (e.g. a grid/table view switch) */
  actions?: React.ReactNode
  /** Extra classes for the فلاتر toggle button (default: visitor tone bg-background-2) */
  filterButtonClassName?: string
}

const ListingToolbar: React.FC<ListingToolbarProps> = ({
  searchProps,
  filterSections = [],
  onApplyFilters,
  quickFilterIds = [],
  quickFilterSections = [],
  actions,
  filterButtonClassName,
}) => {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const openFiltersDisclosure = { isOpen: filtersOpen, onOpen: () => setFiltersOpen(true), onClose: () => setFiltersOpen(false), setIsOpen: setFiltersOpen }
  const visible = listingFilterSectionsVisible(filterSections)

  const hasQuickFilters = quickFilterIds.length > 0 || quickFilterSections.length > 0

  const dialogSections = hasQuickFilters
    ? visible.filter((s) => !quickFilterIds.includes(s.id))
    : visible.length > 1
      ? visible
      : []

  const useDialog = dialogSections.length > 0

  const searchPlaceholder = searchProps?.placeholder ?? 'اسم الكتاب / المؤلف ...'

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="flex flex-wrap gap-3 items-center min-w-0 flex-1">
          {actions}
          {useDialog ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              onClick={openFiltersDisclosure.onOpen}
              aria-label="تصفية"
              className={cn(
                'h-10 w-10 rounded-lg',
                filterButtonClassName ?? 'bg-background-2',
              )}
            >
              <Funnel />
            </Button>
          ) : null}
          {searchProps?.enabled ? (
            <div className="relative w-full min-w-[200px] max-w-full sm:max-w-sm flex-1">
              <Search className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder={searchPlaceholder}
                className="h-10 pe-10 bg-background w-full rounded-xl"
                value={searchProps.value}
                onChange={(e) => searchProps.onChange(e.target.value)}
              />
            </div>
          ) : null}
        </div>

        {quickFilterSections.length > 0 ? (
          <div className="flex flex-wrap gap-4 w-full sm:w-auto sm:max-w-2xl">
            {quickFilterSections.map((section) => (
              <ListingFiltersGroup
                key={section.id}
                options={section.options}
                values={section.value}
                onChange={(v) => {
                  section.onChange(v)
                  onApplyFilters?.()
                }}
                multiple={section.multiple}
                buttonClassName={section.buttonClassName}
              />
            ))}
          </div>
        ) : !useDialog && !hasQuickFilters && visible.length === 1 ? (
          <div className="flex flex-wrap gap-4 w-full sm:w-auto sm:max-w-2xl">
            <ListingFiltersGroup
              options={visible[0].options}
              values={visible[0].value}
              onChange={(v) => {
                visible[0].onChange(v)
                onApplyFilters?.()
              }}
              multiple={visible[0].multiple}
              buttonClassName={visible[0].buttonClassName}
            />
          </div>
        ) : null}
      </div>

      {useDialog ? (
        <ListingFiltersDialog
          isOpen={openFiltersDisclosure.isOpen}
          setIsOpen={openFiltersDisclosure.setIsOpen}
          sections={dialogSections}
          onApplyFilters={onApplyFilters}
        />
      ) : null}
    </>
  )
}

export default ListingToolbar
