'use client'

import { useState, useTransition } from 'react'
import { Loader2Icon } from 'lucide-react'
import { setCanCreateListsAction, setActiveAction, setRoleAction } from '../actions'
import type { Profile } from '@/lib/db/queries/profiles'
import { ROLE_LABELS, INVITABLE_ROLES } from '@/lib/auth/roles'
import { Button } from '@/components/ui/button'
import {
  SelectField,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export function Roster({
  members,
  currentUserId,
}: {
  members: Profile[]
  currentUserId: string
}) {
  return (
    <ul className="flex flex-col gap-2">
      {members.map((m) => (
        <MemberRow key={m.id} member={m} isSelf={m.id === currentUserId} />
      ))}
    </ul>
  )
}

// Inline role editor for a non-owner, non-self member. Assignable roles are
// INVITABLE_ROLES (everything except owner).
function RoleSelect({
  role,
  disabled,
  onChange,
}: {
  role: Profile['role']
  disabled: boolean
  onChange: (role: string) => void
}) {
  return (
    <SelectField
      value={role}
      disabled={disabled}
      onValueChange={(v) => {
        if (v && v !== role) onChange(v)
      }}
    >
      <SelectTrigger className="mt-0.5 h-9 min-h-9 w-auto text-sm">
        <SelectValue>{() => ROLE_LABELS[role]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {INVITABLE_ROLES.map((r) => (
          <SelectItem key={r} value={r}>
            {ROLE_LABELS[r]}
          </SelectItem>
        ))}
      </SelectContent>
    </SelectField>
  )
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
      {children}
    </span>
  )
}

function MemberRow({ member, isSelf }: { member: Profile; isSelf: boolean }) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const isOwner = member.role === 'owner'

  const run = (fn: () => Promise<{ error?: string }>) =>
    start(async () => {
      const res = await fn()
      setError(res.error ?? null)
    })

  return (
    <li className={cn('rounded-lg border p-3', !member.isActive && 'opacity-60')}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-medium">
            {member.firstName} {member.lastName}
            {isSelf && <span className="font-normal text-muted-foreground"> (you)</span>}
          </div>
          {isOwner || isSelf ? (
            <div className="text-sm text-muted-foreground">{ROLE_LABELS[member.role]}</div>
          ) : (
            <RoleSelect
              role={member.role}
              disabled={pending}
              onChange={(r) => run(() => setRoleAction(member.id, r))}
            />
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          {!member.isActive && <Badge>Inactive</Badge>}
          {member.canCreateLists && <Badge>Lists</Badge>}
        </div>
      </div>

      {/* The owner's perms/status are fixed, and no self-action is valid. */}
      {!isOwner && !isSelf && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-[44px]"
            disabled={pending}
            onClick={() => run(() => setCanCreateListsAction(member.id, !member.canCreateLists))}
          >
            {member.canCreateLists ? 'Revoke list access' : 'Allow list creation'}
          </Button>
          <Button
            type="button"
            variant={member.isActive ? 'destructive' : 'outline'}
            size="sm"
            className="min-h-[44px]"
            disabled={pending}
            onClick={() => run(() => setActiveAction(member.id, !member.isActive))}
          >
            {member.isActive ? 'Deactivate' : 'Reactivate'}
          </Button>
          {pending && <Loader2Icon className="size-4 animate-spin self-center" />}
        </div>
      )}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </li>
  )
}
