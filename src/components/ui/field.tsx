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

// `required` marks the label with a red asterisk. Marking what's required lets the
// optional fields drop their "(optional)" suffixes, which were the longer strings and
// the ones that wrapped awkwardly on narrow screens.
function FieldLabel({
  className,
  required,
  children,
  ...props
}: Field.Label.Props & { required?: boolean }) {
  return (
    <Field.Label
      data-slot="field-label"
      className={cn('text-sm font-medium text-foreground', className)}
      {...props}
    >
      {children}
      {required && (
        <span aria-hidden="true" className="ml-0.5 text-destructive">
          *
        </span>
      )}
    </Field.Label>
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

// For our OWN validation messages. Base UI's `Field.Error` only renders when the
// browser's native validity says the field is invalid — which never happens on a form
// that opts out with `noValidate`, so client-validated forms need their own element.
// `role="alert"` so the message is announced when it appears.
function FieldMessage({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="field-message"
      role="alert"
      className={cn('text-sm text-destructive', className)}
      {...props}
    />
  )
}

export { FieldRoot as Field, FieldLabel, FieldError, FieldMessage, FieldDescription }
