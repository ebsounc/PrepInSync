'use client'

import { useRef, useActionState } from 'react'
import { Loader2Icon } from 'lucide-react'
import { resetPasswordAction } from '@/app/(auth)/actions'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function PasswordForm({ submitLabel = 'Set password' }: { submitLabel?: string }) {
  const [state, action, isPending] = useActionState(resetPasswordAction, null)
  const passwordRef = useRef<HTMLInputElement>(null)

  return (
    <form action={action} className="flex flex-col gap-4">
      {state?.error && (
        <div role="alert" className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {state.error}
        </div>
      )}
      <Field name="password">
        <FieldLabel>New password</FieldLabel>
        <Input
          ref={passwordRef}
          type="password"
          name="password"
          required
          minLength={8}
          placeholder="Min. 8 characters"
          autoComplete="new-password"
        />
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
        {isPending ? <Loader2Icon className="size-4 animate-spin" /> : submitLabel}
      </Button>
    </form>
  )
}
