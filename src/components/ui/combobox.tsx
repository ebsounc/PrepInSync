'use client'

import type { ReactNode } from 'react'
import { Combobox } from '@base-ui/react/combobox'
import { SearchIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

// Thin wrapper over base-ui's Combobox, styled to match ui/select.tsx (big touch
// targets, greasy-hands mobile). The caller supplies `items` + a `filter` on
// ComboboxField (Combobox.Root) to control what the search matches.

const ComboboxField = Combobox.Root

function ComboboxInput({ className, ...props }: Combobox.Input.Props) {
  return (
    <div className="relative">
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 opacity-50" />
      <Combobox.Input
        className={cn(
          'flex min-h-[44px] w-full items-center rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-base text-foreground transition-colors placeholder:text-muted-foreground hover:bg-muted/50 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
          className
        )}
        {...props}
      />
    </div>
  )
}

// `children` is a render function called per filtered item; `empty` shows when the
// filter matches nothing (Combobox.Empty is a sibling of the List, per base-ui).
function ComboboxContent<T>({
  children,
  empty,
  className,
}: {
  children: (item: T, index: number) => ReactNode
  empty?: ReactNode
  className?: string
}) {
  return (
    <Combobox.Portal>
      <Combobox.Positioner sideOffset={4} className="z-50">
        <Combobox.Popup
          data-slot="combobox-content"
          className={cn(
            'max-h-64 w-[var(--anchor-width)] overflow-y-auto rounded-lg border border-border bg-popover shadow-md outline-none',
            className
          )}
        >
          {empty != null && (
            <Combobox.Empty className="px-3 py-2 text-sm text-muted-foreground">
              {empty}
            </Combobox.Empty>
          )}
          <Combobox.List className="p-1">{children}</Combobox.List>
        </Combobox.Popup>
      </Combobox.Positioner>
    </Combobox.Portal>
  )
}

function ComboboxItem({ className, children, ...props }: Combobox.Item.Props) {
  return (
    <Combobox.Item
      data-slot="combobox-item"
      className={cn(
        'relative flex min-h-[44px] cursor-pointer items-center rounded-md px-3 py-2 text-sm text-foreground outline-none select-none data-[highlighted]:bg-muted',
        className
      )}
      {...props}
    >
      {children}
    </Combobox.Item>
  )
}

export { ComboboxField, ComboboxInput, ComboboxContent, ComboboxItem }
