'use client'

import { useState, useActionState } from 'react'
import Link from 'next/link'
import { EyeIcon, EyeOffIcon, Loader2Icon } from 'lucide-react'
import { loginAction } from '@/app/(auth)/actions'
import { useT } from '@/lib/i18n/client'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function LoginForm() {
  const { dict } = useT()
  const [state, action, isPending] = useActionState(loginAction, null)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <form action={action} className="flex flex-col gap-4">
      {state?.error && (
        <div role="alert" className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {state.error}
        </div>
      )}
      <Field name="email">
        <FieldLabel>{dict.auth.email}</FieldLabel>
        <Input
          type="email"
          name="email"
          required
          placeholder={dict.auth.emailPlaceholder}
          autoComplete="email"
          autoFocus
        />
        <FieldError />
      </Field>
      <Field name="password">
        <FieldLabel>{dict.auth.password}</FieldLabel>
        <div className="relative">
          <Input
            type={showPassword ? 'text' : 'password'}
            name="password"
            required
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
            {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
          </button>
        </div>
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
