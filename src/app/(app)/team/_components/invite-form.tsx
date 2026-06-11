'use client'

import { useActionState } from 'react'
import { Loader2Icon } from 'lucide-react'
import { inviteTeamMemberAction } from '@/app/(app)/team/actions'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
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

  return (
    <form
      action={action}
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
          <FieldLabel>{dict.team.firstName}</FieldLabel>
          <Input type="text" name="firstName" required placeholder={dict.team.firstNamePlaceholder} />
          <FieldError />
        </Field>
        <Field name="lastName">
          <FieldLabel>{dict.team.lastName}</FieldLabel>
          <Input type="text" name="lastName" required placeholder={dict.team.lastNamePlaceholder} />
          <FieldError />
        </Field>
      </div>
      <Field name="email">
        <FieldLabel>{dict.team.email}</FieldLabel>
        <Input
          type="email"
          name="email"
          required
          placeholder={dict.team.emailPlaceholder}
          autoComplete="off"
        />
        <FieldError />
      </Field>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">{dict.team.role}</label>
        <SelectField name="role">
          <SelectTrigger>
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
      </div>
      <Button type="submit" className="w-full min-h-[52px] text-base" disabled={isPending}>
        {isPending ? <Loader2Icon className="size-4 animate-spin" /> : dict.team.sendInvite}
      </Button>
    </form>
  )
}
