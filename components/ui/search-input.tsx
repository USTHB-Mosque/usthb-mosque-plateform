'use client'

import * as React from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type SearchInputProps = React.ComponentProps<typeof Input> & {
  showShortcut?: boolean
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, showShortcut = true, placeholder, ...props }, ref) => {
    const handleShortcut = (event: React.KeyboardEvent<HTMLInputElement>) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        event.currentTarget.focus()
      }
      props.onKeyDown?.(event)
    }

    return (
      <div
        role="search"
        className={cn(
          'relative flex items-center rounded-lg border border-input bg-card transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50',
          className,
        )}
      >
        <Search className="pointer-events-none absolute start-3 size-4 text-muted-foreground" />
        <Input
          ref={ref}
          type="search"
          onKeyDown={handleShortcut}
          placeholder={placeholder ?? 'البحث ...'}
          className="h-8 border-0 bg-transparent pe-12 ps-9 shadow-none focus-visible:ring-0 focus-visible:border-0"
          {...props}
        />
        {showShortcut ? (
          <kbd className="pointer-events-none absolute end-3 hidden rounded border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
            ⌘K
          </kbd>
        ) : null}
      </div>
    )
  },
)
SearchInput.displayName = 'SearchInput'

export default SearchInput
