import type { ReactNode } from 'react'

export interface ListingFilterOption {
  value: string
  label: string
  buttonClassName?: string
}

/**
 * One filter group (types, language, availability, etc.).
 * Parent owns URL/state; `value` / `onChange` stay in sync with applied filters.
 */
export interface ListingFilterSection {
  id: string
  title: string
  icon?: ReactNode
  options: ListingFilterOption[]
  multiple: boolean
  value: string | string[]
  onChange: (value: string | string[]) => void
  buttonClassName?: string
  /** Draft reset in dialog; default: [] for multiple, first option with value `all` or `options[0]` for single */
  resetValue?: string | string[]
}

/** Sections with at least one option (empty groups are ignored). */
export function listingFilterSectionsVisible(sections: ListingFilterSection[]): ListingFilterSection[] {
  return sections.filter((s) => s.options.length > 0)
}
