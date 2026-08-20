'use client'

import React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Funnel } from 'lucide-react'
import { useDisclosure } from '@/hooks/use-disclosure'
import ListingFiltersDialog from './ListingFiltersDialog'
import ListingFiltersGroup from './ListingFiltersGroup'
import { listingFilterSectionsVisible, type ListingFilterSection } from './listing-filter.types'

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
}

const ListingToolbar: React.FC<ListingToolbarProps> = ({
  searchProps,
  filterSections = [],
  onApplyFilters,
  quickFilterIds = [],
  quickFilterSections = [],
}) => {
  const openFiltersDisclosure = useDisclosure()
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
          {useDialog ? (
            <Button
              type="button"
              size="icon-lg"
              onClick={openFiltersDisclosure.onOpen}
              aria-label="تصفية"
              className="h-10 w-10 rounded-lg"
            >
              <Funnel />
            </Button>
          ) : null}
          {searchProps?.enabled ? (
            <div className="relative w-full min-w-[200px] max-w-full sm:max-w-sm flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder={searchPlaceholder}
                className="h-10 pr-10 bg-background w-full rounded-xl"
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
