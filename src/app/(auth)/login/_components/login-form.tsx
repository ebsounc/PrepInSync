'use client'

import { startTransition, useState, useActionState } from 'react'
import Link from 'next/link'
import { EyeIcon, EyeOffIcon, Loader2Icon } from 'lucide-react'
import { loginAction } from '@/app/(auth)/actions'
import { useT } from '@/lib/i18n/client'
import { collectErrors, emailError, requiredError, type FieldErrors } from '@/lib/form-validation'
import { Field, FieldLabel, FieldMessage } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function LoginForm() {
  const { dict } = useT()
  const [state, action, isPending] = useActionState(loginAction, null)
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const get = (name: string) => String(data.get(name) ?? '')

    const found = collectErrors({
      email: emailError(get('email'), dict),
      // Length isn't checked on sign-in — an existing password predates any rule.
      password: requiredError(get('password'), dict),
    })
    setErrors(found)
    if (Object.keys(found).length > 0) {
      form.querySelector<HTMLElement>(`[name="${Object.keys(found)[0]}"]`)?.focus()
      return
    }
    // Dispatched manually so a rejected sign-in doesn't wipe the typed email: React 19
    // resets any uncontrolled form whose `action` is a function once it settles.
    // Must be inside a transition — otherwise `isPending` never flips and the router
    // throws a hook-order error when the action redirects.
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
      <Field name="email">
        <FieldLabel required>{dict.auth.email}</FieldLabel>
        <Input
          type="email"
          name="email"
          required
          aria-invalid={Boolean(errors.email)}
          onInput={() => clearError('email')}
          placeholder={dict.auth.emailPlaceholder}
          autoComplete="email"
          autoFocus
        />
        {errors.email && <FieldMessage>{errors.email}</FieldMessage>}
      </Field>
      <Field name="password">
        <FieldLabel required>{dict.auth.password}</FieldLabel>
        <div className="relative">
          <Input
            type={showPassword ? 'text' : 'password'}
            name="password"
            required
            aria-invalid={Boolean(errors.password)}
            onInput={() => clearError('password')}
            placeholder={dict.auth.passwordPlaceholder}
            autoComplete="current-password"
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
            tabIndex={-1}
            aria-label={showPassword ? dict.auth.hidePassword : dict.auth.showPassword}
          >
            {/* Open eye = the password is currently visible. */}
            {showPassword ? <EyeIcon className="size-4" /> : <EyeOffIcon className="size-4" />}
          </button>
        </div>
        {errors.password && <FieldMessage>{errors.password}</FieldMessage>}
      </Field>
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm text-primary hover:underline">
          {dict.auth.forgotLink}
        </Link>
      </div>
      <Button type="submit" className="w-full min-h-[52px] text-base" disabled={isPending}>
        {isPending ? <Loader2Icon className="size-4 animate-spin" /> : dict.auth.signIn}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {dict.auth.noAccount}{' '}
        <Link href="/signup" className="text-primary hover:underline">
          {dict.auth.signUp}
        </Link>
      </p>
    </form>
  )
}
