'use client'

import { Select } from '@base-ui/react/select'
import { CheckIcon, ChevronDownIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

const SelectField = Select.Root

function SelectTrigger({ className, children, ...props }: Select.Trigger.Props) {
  return (
    <Select.Trigger
      data-slot="select-trigger"
      className={cn(
        'flex min-h-[44px] w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-base text-foreground transition-colors hover:bg-muted/50 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
      <Select.Icon className="ml-2 shrink-0 opacity-50">
        <ChevronDownIcon className="size-4" />
      </Select.Icon>
    </Select.Trigger>
  )
}

const SelectValue = Select.Value

function SelectContent({ className, children, ...props }: Select.Popup.Props) {
  return (
    <Select.Portal>
      <Select.Positioner sideOffset={4}>
        <Select.Popup
          data-slot="select-content"
          className={cn(
            'z-50 max-h-64 w-[var(--available-width)] overflow-y-auto rounded-lg border border-border bg-popover shadow-md outline-none',
            className
          )}
          {...props}
        >
          <Select.List className="p-1">{children}</Select.List>
        </Select.Popup>
      </Select.Positioner>
    </Select.Portal>
  )
}

const SelectGroup = Select.Group

function SelectGroupLabel({ className, ...props }: Select.GroupLabel.Props) {
  return (
    <Select.GroupLabel
      className={cn('px-2 py-1.5 text-xs font-semibold text-muted-foreground', className)}
      {...props}
    />
  )
}

function SelectItem({ className, children, ...props }: Select.Item.Props) {
  return (
    <Select.Item
      data-slot="select-item"
      className={cn(
        'relative flex min-h-[44px] cursor-pointer items-center rounded-md px-3 py-2 pr-8 text-sm text-foreground outline-none select-none data-[highlighted]:bg-muted data-[selected]:font-medium',
        className
      )}
      {...props}
    >
      <Select.ItemText>{children}</Select.ItemText>
      <Select.ItemIndicator className="absolute right-2">
        <CheckIcon className="size-4" />
      </Select.ItemIndicator>
    </Select.Item>
  )
}

export {
  SelectField,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectGroupLabel,
  SelectItem,
}
