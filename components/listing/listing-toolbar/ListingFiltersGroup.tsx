import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Tag } from 'lucide-react'
import React from 'react'

export interface ListingFilter {
  value: string
  label: string
  buttonClassName?: string
}
interface ListingFiltersGroupProps {
  title: string
  icon: React.ReactNode
  filters: ListingFilter[]
}

const ListingFiltersGroup: React.FC<ListingFiltersGroupProps> = ({ title, icon, filters }) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <div className="[&>svg]:w-6 [&>svg]:h-6 [&>svg]:text-primary">{icon}</div>
        <p className="text-xl font-bold">{title}</p>
      </div>
      <div className="flex flex-wrap gap-4">
        {filters.map((filter) => (
          <Button
            key={filter.value}
            className={cn('text-foreground bg-primary/30', filter.buttonClassName)}
          >
            {filter.label}
          </Button>
        ))}
      </div>
    </div>
  )
}

export default ListingFiltersGroup
