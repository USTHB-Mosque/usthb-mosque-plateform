import React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Funnel } from 'lucide-react'
import { useDisclosure } from '@/hooks/use-disclosure'
import ListingFiltersDialog from './ListingFiltersDialog'
import { ListingFilter } from './ListingFiltersGroup'

export interface ListingSearchProps {
  enabled?: boolean
  value: string
  onChange: (value: string) => void
}

export interface ListingFiltersProps {
  enabled: boolean
  values: string[]
  onChange: (values: string[]) => void
  options: ListingFilter[]
}

export interface ListingLanguageProps {
  enabled: boolean
  values: string[]
  onChange: (values: string[]) => void
  options: ListingFilter[]
}

export interface ListingAvailabilityProps {
  enabled: boolean
  value: string
  onChange: (value: string) => void
  options: ListingFilter[]
  buttonClassName?: string
}

export interface ListingToolbarProps {
  searchProps?: ListingSearchProps
  filtersProps?: ListingFiltersProps
  languageProps?: ListingLanguageProps
  availabilityProps?: ListingAvailabilityProps
  /** Runs after the user confirms filters in the dialog (e.g. reset page to 1). */
  onApplyFilters?: () => void
}

const ListingToolbar: React.FC<ListingToolbarProps> = ({
  searchProps,
  filtersProps,
  languageProps,
  availabilityProps,
  onApplyFilters,
}) => {
  const openFiltersDisclosure = useDisclosure()

  return (
    <>
      <div className="flex gap-4 justify-between">
        <div className="flex gap-3">
          <Button onClick={openFiltersDisclosure.onOpen}>
            <Funnel />
          </Button>
          {searchProps?.enabled ? (
            <div className="relative w-full lg:w-sm">
              <Search className="absolute right-3 translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="اسم الكتاب / المؤلف ..."
                className="pr-10 bg-background w-full rounded-xl"
                value={searchProps?.value}
                onChange={(e) => searchProps?.onChange(e.target.value)}
              />
            </div>
          ) : null}
        </div>
      </div>
      <ListingFiltersDialog
        isOpen={openFiltersDisclosure.isOpen}
        setIsOpen={openFiltersDisclosure.setIsOpen}
        filtersProps={filtersProps}
        languageProps={languageProps}
        availabilityProps={availabilityProps}
        onApplyFilters={onApplyFilters}
      />
    </>
  )
}

export default ListingToolbar
