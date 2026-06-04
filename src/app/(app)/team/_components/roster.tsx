'use client'

import { useState, useTransition } from 'react'
import { Loader2Icon } from 'lucide-react'
import { setCanCreateListsAction, setActiveAction } from '../actions'
import type { Profile } from '@/lib/db/queries/profiles'
import { ROLE_LABELS } from '@/lib/auth/roles'
import { Button } from '@/components/ui/button'
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
          <div className="text-sm text-muted-foreground">{ROLE_LABELS[member.role]}</div>
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
