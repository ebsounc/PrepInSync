'use client'

import { startTransition, useState, useActionState } from 'react'
import { Loader2Icon } from 'lucide-react'
import { resetPasswordAction } from '@/app/(auth)/actions'
import { useT } from '@/lib/i18n/client'
import {
  collectErrors,
  confirmPasswordError,
  passwordError,
  type FieldErrors,
} from '@/lib/form-validation'
import { Field, FieldLabel, FieldMessage } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function PasswordForm({ submitLabel }: { submitLabel?: string }) {
  const { dict } = useT()
  const [state, action, isPending] = useActionState(resetPasswordAction, null)
  const [errors, setErrors] = useState<FieldErrors>({})

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const password = String(data.get('password') ?? '')

    const found = collectErrors({
      password: passwordError(password, dict),
      confirmPassword: confirmPasswordError(
        String(data.get('confirmPassword') ?? ''),
        password,
        dict
      ),
    })
    setErrors(found)
    if (Object.keys(found).length > 0) {
      form.querySelector<HTMLElement>(`[name="${Object.keys(found)[0]}"]`)?.focus()
      return
    }
    // Transition required: without it isPending never flips and a redirecting
    // action throws a hook-order error in the router.
    startTransition(() => action(data))
  }

  const clearError = (name: string) =>
    setErrors((prev) => {
      if (!prev[name]) return prev
      const { [name]: _removed, ...rest } = prev
      return rest
    })

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {state?.error && (
        <div role="alert" className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {state.error}
        </div>
      )}
      <Field name="password">
        <FieldLabel required>{dict.auth.newPassword}</FieldLabel>
        <Input
          type="password"
          name="password"
          required
          aria-invalid={Boolean(errors.password)}
          onInput={() => clearError('password')}
          placeholder={dict.auth.minChars}
          autoComplete="new-password"
        />
        {errors.password && <FieldMessage>{errors.password}</FieldMessage>}
      </Field>
      <Field name="confirmPassword">
        <FieldLabel required>{dict.auth.confirmPassword}</FieldLabel>
        <Input
          type="password"
          name="confirmPassword"
          required
          aria-invalid={Boolean(errors.confirmPassword)}
          onInput={() => clearError('confirmPassword')}
          placeholder={dict.auth.repeatPassword}
          autoComplete="new-password"
        />
        {errors.confirmPassword && <FieldMessage>{errors.confirmPassword}</FieldMessage>}
      </Field>
      <Button type="submit" className="w-full min-h-[52px] text-base" disabled={isPending}>
        {isPending ? <Loader2Icon className="size-4 animate-spin" /> : (submitLabel ?? dict.auth.setPassword)}
      </Button>
    </form>
  )
}
