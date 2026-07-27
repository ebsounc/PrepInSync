'use client'

import { Dialog } from '@base-ui/react/dialog'
import { cn } from '@/lib/utils'

const DialogRoot = Dialog.Root
const DialogTrigger = Dialog.Trigger
const DialogClose = Dialog.Close

function DialogContent({ className, children, ...props }: Dialog.Popup.Props) {
  return (
    <Dialog.Portal>
      <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px] transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
      <Dialog.Popup
        data-slot="dialog-content"
        className={cn(
          // Bottom-anchored on phones (thumb reach), centered from `sm:` up.
          'fixed inset-x-0 bottom-0 z-50 flex max-h-[85svh] flex-col gap-4 overflow-y-auto rounded-t-2xl border bg-background p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-lg outline-none transition-all',
          'data-[ending-style]:translate-y-4 data-[ending-style]:opacity-0 data-[starting-style]:translate-y-4 data-[starting-style]:opacity-0',
          'sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-sm sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:pb-5',
          'sm:data-[ending-style]:translate-y-[-46%] sm:data-[starting-style]:translate-y-[-46%]',
          className
        )}
        {...props}
      >
        {children}
      </Dialog.Popup>
    </Dialog.Portal>
  )
}

function DialogTitle({ className, ...props }: Dialog.Title.Props) {
  return (
    <Dialog.Title
      data-slot="dialog-title"
      className={cn('text-lg font-semibold', className)}
      {...props}
    />
  )
}

function DialogDescription({ className, ...props }: Dialog.Description.Props) {
  return (
    <Dialog.Description
      data-slot="dialog-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

export {
  DialogRoot as Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogDescription,
}
