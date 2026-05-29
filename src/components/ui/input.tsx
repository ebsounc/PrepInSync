import { Input as InputPrimitive } from '@base-ui/react/input'
import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

const Input = forwardRef<HTMLElement, InputPrimitive.Props>(({ className, ...props }, ref) => {
  return (
    <InputPrimitive
      ref={ref}
      data-slot="input"
      className={cn(
        'min-h-[44px] w-full rounded-lg border border-input bg-background px-3 py-2 text-base text-foreground transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20',
        className
      )}
      {...props}
    />
  )
})
Input.displayName = 'Input'

export { Input }
