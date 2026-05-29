import { Field } from '@base-ui/react/field'
import { cn } from '@/lib/utils'

function FieldRoot({ className, ...props }: Field.Root.Props) {
  return (
    <Field.Root
      data-slot="field"
      className={cn('flex flex-col gap-1.5', className)}
      {...props}
    />
  )
}

function FieldLabel({ className, ...props }: Field.Label.Props) {
  return (
    <Field.Label
      data-slot="field-label"
      className={cn('text-sm font-medium text-foreground', className)}
      {...props}
    />
  )
}

function FieldError({ className, ...props }: Field.Error.Props) {
  return (
    <Field.Error
      data-slot="field-error"
      className={cn('text-sm text-destructive', className)}
      {...props}
    />
  )
}

function FieldDescription({ className, ...props }: Field.Description.Props) {
  return (
    <Field.Description
      data-slot="field-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

export { FieldRoot as Field, FieldLabel, FieldError, FieldDescription }
