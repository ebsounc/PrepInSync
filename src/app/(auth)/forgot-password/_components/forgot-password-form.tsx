'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Loader2Icon, MailCheckIcon } from 'lucide-react'
import { forgotPasswordAction } from '@/app/(auth)/actions'
import { useT } from '@/lib/i18n/client'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function ForgotPasswordForm() {
  const { dict } = useT()
  const [state, action, isPending] = useActionState(forgotPasswordAction, null)

  if (state?.success) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <MailCheckIcon className="size-12 text-primary" />
        <p className="text-sm text-muted-foreground">{dict.auth.forgotSentBody}</p>
        <Link href="/login" className="text-sm text-primary hover:underline">
          {dict.auth.backToSignIn}
        </Link>
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
      <Field name="email">
        <FieldLabel>{dict.auth.emailAddress}</FieldLabel>
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
      <Button type="submit" className="w-full min-h-[52px] text-base" disabled={isPending}>
        {isPending ? <Loader2Icon className="size-4 animate-spin" /> : dict.auth.sendResetLink}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="text-primary hover:underline">
          {dict.auth.backToSignIn}
        </Link>
      </p>
    </form>
  )
}
