import { cn } from '@/lib/utils'
import { Button } from './button'

export interface ButtonGroup<T = string> {
  label: string
  value: T
  disabled?: boolean
}

interface ButtonGroupProps<T> {
  value: string
  buttons: ButtonGroup<T>[]
  onSelect: (value: T) => void
  className?: string
}

export const ButtonGroup = <T,>({ value, buttons, onSelect, className }: ButtonGroupProps<T>) => {
  return (
    <div className="overflow-x-auto scrollbar-hidden">
      <div
        className={cn(
          'flex items-center border border-border gap-1 rounded-lg bg-background p-1 h-[42px] min-w-max',
          className,
        )}
      >
        {buttons.map((button) => (
          <Button
            disabled={button.disabled ?? false}
            key={button.value as string}
            className={`px-6 h-full text-sm whitespace-nowrap flex-1 ${
              button.value !== value ? 'border-none font-semibold' : ''
            }`}
            variant={button.value === value ? 'default' : 'outline'}
            onClick={() => onSelect(button.value)}
          >
            {button.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
