'use client'

import { startTransition, useState, useActionState } from 'react'
import { Loader2Icon } from 'lucide-react'
import { inviteTeamMemberAction } from '@/app/(app)/team/actions'
import {
  collectErrors,
  emailError,
  requiredError,
  type FieldErrors,
} from '@/lib/form-validation'
import { Field, FieldLabel, FieldMessage } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  SelectField,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { INVITABLE_ROLES } from '@/lib/auth/roles'
import { useT } from '@/lib/i18n/client'

export function InviteForm() {
  const { dict, t } = useT()
  const [state, action, isPending] = useActionState(inviteTeamMemberAction, null)
  const [errors, setErrors] = useState<FieldErrors>({})

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const get = (name: string) => String(data.get(name) ?? '')

    const found = collectErrors({
      firstName: requiredError(get('firstName'), dict),
      lastName: requiredError(get('lastName'), dict),
      email: emailError(get('email'), dict),
      role: requiredError(get('role'), dict),
    })
    setErrors(found)
    if (Object.keys(found).length > 0) {
      form.querySelector<HTMLElement>(`[name="${Object.keys(found)[0]}"]`)?.focus()
      return
    }
    // Transition required: without it isPending never flips.
    startTransition(() => action(data))
  }

  const clearError = (name: string) =>
    setErrors((prev) => {
      if (!prev[name]) return prev
      const { [name]: _removed, ...rest } = prev
      return rest
    })

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      // Remount on success to clear the form for the next invite.
      key={state?.success ? state.invitedEmail : 'invite-form'}
      className="flex flex-col gap-4"
    >
      {state?.success && (
        <div className="rounded-lg bg-primary/10 px-3 py-2.5 text-sm text-primary">
          {t(dict.team.inviteSent, { email: state.invitedEmail ?? '' })}
        </div>
      )}
      {state?.error && (
        <div role="alert" className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {state.error}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field name="firstName">
          <FieldLabel required>{dict.team.firstName}</FieldLabel>
          <Input
            type="text"
            name="firstName"
            required
            aria-invalid={Boolean(errors.firstName)}
            onInput={() => clearError('firstName')}
            placeholder={dict.team.firstNamePlaceholder}
          />
          {errors.firstName && <FieldMessage>{errors.firstName}</FieldMessage>}
        </Field>
        <Field name="lastName">
          <FieldLabel required>{dict.team.lastName}</FieldLabel>
          <Input
            type="text"
            name="lastName"
            required
            aria-invalid={Boolean(errors.lastName)}
            onInput={() => clearError('lastName')}
            placeholder={dict.team.lastNamePlaceholder}
          />
          {errors.lastName && <FieldMessage>{errors.lastName}</FieldMessage>}
        </Field>
      </div>
      <Field name="email">
        <FieldLabel required>{dict.team.email}</FieldLabel>
        <Input
          type="email"
          name="email"
          required
          aria-invalid={Boolean(errors.email)}
          onInput={() => clearError('email')}
          placeholder={dict.team.emailPlaceholder}
          autoComplete="off"
        />
        {errors.email && <FieldMessage>{errors.email}</FieldMessage>}
      </Field>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">
          {dict.team.role}
          <span aria-hidden="true" className="ml-0.5 text-destructive">
            *
          </span>
        </label>
        <SelectField name="role" onValueChange={() => clearError('role')}>
          <SelectTrigger aria-invalid={Boolean(errors.role)}>
            <SelectValue placeholder={dict.team.selectRole} />
          </SelectTrigger>
          <SelectContent>
            {INVITABLE_ROLES.map((role) => (
              <SelectItem key={role} value={role}>
                {dict.roles[role]}
              </SelectItem>
            ))}
          </SelectContent>
        </SelectField>
        {errors.role && <FieldMessage>{errors.role}</FieldMessage>}
      </div>
      <Button type="submit" className="w-full min-h-[52px] text-base" disabled={isPending}>
        {isPending ? <Loader2Icon className="size-4 animate-spin" /> : dict.team.sendInvite}
      </Button>
    </form>
  )
}
