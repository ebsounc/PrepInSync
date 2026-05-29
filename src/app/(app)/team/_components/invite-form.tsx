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
import { ROLE_LABELS, INVITABLE_ROLES } from '@/lib/auth/roles'

export function InviteForm() {
  const [state, action, isPending] = useActionState(inviteTeamMemberAction, null)

  return (
    <form
      action={action}
      key={state?.success ? state.invitedEmail : 'invite-form'}
      className="flex flex-col gap-4"
    >
      {state?.success && (
        <div className="rounded-lg bg-primary/10 px-3 py-2.5 text-sm text-primary">
          Invite sent to {state.invitedEmail}.
        </div>
      )}
      {state?.error && (
        <div role="alert" className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {state.error}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field name="firstName">
          <FieldLabel>First name</FieldLabel>
          <Input type="text" name="firstName" required placeholder="Jane" />
          <FieldError />
        </Field>
        <Field name="lastName">
          <FieldLabel>Last name</FieldLabel>
          <Input type="text" name="lastName" required placeholder="Smith" />
          <FieldError />
        </Field>
      </div>
      <Field name="email">
        <FieldLabel>Email</FieldLabel>
        <Input
          type="email"
          name="email"
          required
          placeholder="jane@restaurant.com"
          autoComplete="off"
        />
        <FieldError />
      </Field>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">Role</label>
        <SelectField name="role">
          <SelectTrigger>
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            {INVITABLE_ROLES.map((role) => (
              <SelectItem key={role} value={role}>
                {ROLE_LABELS[role]}
              </SelectItem>
            ))}
          </SelectContent>
        </SelectField>
      </div>
      <Button type="submit" className="w-full min-h-[52px] text-base" disabled={isPending}>
        {isPending ? <Loader2Icon className="size-4 animate-spin" /> : 'Send invite'}
      </Button>
    </form>
  )
}
