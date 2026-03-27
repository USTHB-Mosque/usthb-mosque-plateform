import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import React from 'react'

export interface ListingFilter {
  value: string
  label: string
}

interface ListingFiltersGroupProps {
  title: string
  icon: React.ReactNode
  options?: ListingFilter[]
  values: string[] | string
  onChange: (values: any) => void
  multiple?: boolean
  buttonClassName?: string
}

const ListingFiltersGroup: React.FC<ListingFiltersGroupProps> = ({
  title,
  icon,
  options,
  values,
  onChange,
  multiple = false,
  buttonClassName,
}) => {
  const handleSelect = (value: string) => {
    if (multiple) {
      const currentValues = Array.isArray(values) ? values : []
      if (currentValues.includes(value)) {
        onChange(currentValues.filter((v) => v !== value))
      } else {
        onChange([...currentValues, value])
      }
    } else {
      onChange(value)
    }
  }

  const isSelected = (value: string) => {
    if (multiple && Array.isArray(values)) {
      return values.includes(value)
    }
    return values === value
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <div className="[&>svg]:w-6 [&>svg]:h-6 [&>svg]:text-primary">{icon}</div>
        <p className="text-xl font-bold">{title}</p>
      </div>
      <div className="flex flex-wrap gap-4">
        {options?.map((option) => {
          const active = isSelected(option.value)

          return (
            <Button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              variant={active ? 'default' : 'outline'}
              className={buttonClassName}
            >
              {option.label}
            </Button>
          )
        })}
      </div>
    </div>
  )
}

export default ListingFiltersGroup
