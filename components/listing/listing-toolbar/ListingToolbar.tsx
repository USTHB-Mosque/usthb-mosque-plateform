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
}

const ListingToolbar: React.FC<ListingToolbarProps> = ({
  searchProps,
  filterSections = [],
  onApplyFilters,
}) => {
  const openFiltersDisclosure = useDisclosure()
  const visible = listingFilterSectionsVisible(filterSections)
  const useDialog = visible.length > 1
  const inlineSection = visible.length === 1 ? visible[0] : undefined

  const searchPlaceholder = searchProps?.placeholder ?? 'اسم الكتاب / المؤلف ...'

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="flex flex-wrap gap-3 items-center min-w-0 flex-1">
          {useDialog ? (
            <Button type="button" onClick={openFiltersDisclosure.onOpen} aria-label="تصفية">
              <Funnel />
            </Button>
          ) : null}
          {searchProps?.enabled ? (
            <div className="relative w-full min-w-[200px] max-w-full sm:max-w-sm flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder={searchPlaceholder}
                className="pr-10 bg-background w-full rounded-xl"
                value={searchProps.value}
                onChange={(e) => searchProps.onChange(e.target.value)}
              />
            </div>
          ) : null}
        </div>

        {inlineSection ? (
          <div className="flex flex-wrap gap-4 w-full sm:w-auto sm:max-w-2xl">
            <ListingFiltersGroup
              options={inlineSection.options}
              values={inlineSection.value}
              onChange={(v) => {
                inlineSection.onChange(v)
                onApplyFilters?.()
              }}
              multiple={inlineSection.multiple}
              buttonClassName={inlineSection.buttonClassName}
            />
          </div>
        ) : null}
      </div>

      {useDialog ? (
        <ListingFiltersDialog
          isOpen={openFiltersDisclosure.isOpen}
          setIsOpen={openFiltersDisclosure.setIsOpen}
          sections={visible}
          onApplyFilters={onApplyFilters}
        />
      ) : null}
    </>
  )
}

export default ListingToolbar
