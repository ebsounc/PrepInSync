'use client'

import { useRef, useState, useActionState } from 'react'
import Link from 'next/link'
import { EyeIcon, EyeOffIcon, Loader2Icon, MailCheckIcon } from 'lucide-react'
import { signupAction } from '@/app/(auth)/actions'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function SignupForm() {
  const [state, action, isPending] = useActionState(signupAction, null)
  const [showPassword, setShowPassword] = useState(false)
  const passwordRef = useRef<HTMLInputElement>(null)

  if (state?.success) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <MailCheckIcon className="size-12 text-primary" />
        <div>
          <p className="font-medium">Check your email</p>
          <p className="mt-1 text-sm text-muted-foreground">
            We sent a confirmation link to your inbox. Click it to finish setting up your account.
          </p>
        </div>
      </div>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      {state?.error && (
        <div role="alert" className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {state.error}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field name="firstName">
          <FieldLabel>First name</FieldLabel>
          <Input
            type="text"
            name="firstName"
            required
            placeholder="Jane"
            autoComplete="given-name"
            autoFocus
          />
          <FieldError />
        </Field>
        <Field name="lastName">
          <FieldLabel>Last name</FieldLabel>
          <Input
            type="text"
            name="lastName"
            required
            placeholder="Smith"
            autoComplete="family-name"
          />
          <FieldError />
        </Field>
      </div>
      <Field name="email">
        <FieldLabel>Email</FieldLabel>
        <Input
          type="email"
          name="email"
          required
          placeholder="you@restaurant.com"
          autoComplete="email"
        />
        <FieldError />
      </Field>
      <Field name="password">
        <FieldLabel>Password</FieldLabel>
        <div className="relative">
          <Input
            ref={passwordRef}
            type={showPassword ? 'text' : 'password'}
            name="password"
            required
            minLength={8}
            placeholder="Min. 8 characters"
            autoComplete="new-password"
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
          </button>
        </div>
        <FieldError />
      </Field>
      <Field name="confirmPassword">
        <FieldLabel>Confirm password</FieldLabel>
        <Input
          type="password"
          name="confirmPassword"
          required
          placeholder="Repeat your password"
          autoComplete="new-password"
          onInput={(e) => {
            e.currentTarget.setCustomValidity(
              e.currentTarget.value !== (passwordRef.current?.value ?? '')
                ? 'Passwords do not match'
                : ''
            )
          }}
        />
        <FieldError />
      </Field>
      <Button type="submit" className="w-full min-h-[52px] text-base" disabled={isPending}>
        {isPending ? <Loader2Icon className="size-4 animate-spin" /> : 'Create account'}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  )
}
