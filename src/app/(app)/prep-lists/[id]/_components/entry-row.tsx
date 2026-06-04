'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import {
  CheckCircle2Icon,
  CircleIcon,
  Loader2Icon,
  MessageSquareIcon,
  PencilIcon,
  StarIcon,
  Trash2Icon,
} from 'lucide-react'
import {
  toggleCompletionAction,
  saveNoteAction,
  setStarAction,
  removeEntryAction,
  updateEntryAction,
  type ListActionState,
} from '../../actions'
import type { PrepListEntryWithMeta } from '@/lib/db/queries/prep-lists'
import { formatQuantity } from '@/lib/units'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { UnitSelect } from '@/components/unit-select'
import { cn } from '@/lib/utils'

export function EntryRow({
  entry,
  canManage,
}: {
  entry: PrepListEntryWithMeta
  canManage: boolean
}) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return <EditEntryForm entry={entry} onDone={() => setEditing(false)} />
  }
  return <DisplayEntry entry={entry} canManage={canManage} onEdit={() => setEditing(true)} />
}

function DisplayEntry({
  entry,
  canManage,
  onEdit,
}: {
  entry: PrepListEntryWithMeta
  canManage: boolean
  onEdit: () => void
}) {
  const [togglePending, startToggle] = useTransition()

  return (
    <li className={cn('rounded-lg border', entry.completed && 'bg-muted/40')}>
      <div className="flex items-stretch">
        {/* The whole left region is the completion toggle — a big greasy-hands target. */}
        <button
          type="button"
          disabled={togglePending}
          aria-pressed={entry.completed}
          onClick={() => startToggle(() => toggleCompletionAction(entry.id).then(() => {}))}
          className="flex min-h-[56px] flex-1 items-center gap-3 p-3 text-left"
        >
          {togglePending ? (
            <Loader2Icon className="size-6 shrink-0 animate-spin" />
          ) : entry.completed ? (
            <CheckCircle2Icon className="size-6 shrink-0 text-primary" />
          ) : (
            <CircleIcon className="size-6 shrink-0 text-muted-foreground" />
          )}
          <span className="min-w-0">
            <span
              className={cn(
                'flex items-center gap-1.5 font-medium',
                entry.completed && 'text-muted-foreground line-through'
              )}
            >
              {entry.isStarred && (
                <StarIcon className="size-4 shrink-0 fill-current text-amber-500" />
              )}
              <span className="truncate">{entry.itemName}</span>
            </span>
            <span className="text-sm text-muted-foreground">
              {formatQuantity(entry.quantity)} {entry.unit}
            </span>
          </span>
        </button>
        {canManage && (
          <div className="flex items-center p-2">
            <StarToggle entry={entry} />
          </div>
        )}
      </div>

      {entry.completed && entry.completedByName && (
        <p className="px-3 pb-1 text-xs text-muted-foreground">Done by {entry.completedByName}</p>
      )}

      <NoteSection entry={entry} />

      {canManage && (
        <div className="flex gap-1 border-t px-2 py-1">
          <Button type="button" variant="ghost" size="sm" className="min-h-[44px]" onClick={onEdit}>
            <PencilIcon /> Edit
          </Button>
          <RemoveEntryButton id={entry.id} />
        </div>
      )}
    </li>
  )
}

function StarToggle({ entry }: { entry: PrepListEntryWithMeta }) {
  const [pending, start] = useTransition()
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-11"
      aria-label={entry.isStarred ? 'Remove priority' : 'Mark as priority'}
      aria-pressed={entry.isStarred}
      disabled={pending}
      onClick={() => start(() => setStarAction(entry.id, !entry.isStarred).then(() => {}))}
    >
      <StarIcon className={cn(entry.isStarred && 'fill-current text-amber-500')} />
    </Button>
  )
}

function RemoveEntryButton({ id }: { id: string }) {
  const [pending, start] = useTransition()
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="min-h-[44px] text-destructive"
      disabled={pending}
      onClick={() => start(() => removeEntryAction(id).then(() => {}))}
    >
      {pending ? (
        <Loader2Icon className="size-4 animate-spin" />
      ) : (
        <>
          <Trash2Icon /> Remove
        </>
      )}
    </Button>
  )
}

function NoteSection({ entry }: { entry: PrepListEntryWithMeta }) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(entry.notes ?? '')
  const [pending, start] = useTransition()

  if (!open) {
    return (
      <div className="px-3 pb-2">
        {entry.notes ? (
          <button
            type="button"
            onClick={() => {
              setValue(entry.notes ?? '')
              setOpen(true)
            }}
            className="text-left text-sm underline-offset-2 hover:underline"
          >
            <span className="text-muted-foreground">Note:</span> {entry.notes}
          </button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-[44px]"
            onClick={() => {
              setValue('')
              setOpen(true)
            }}
          >
            <MessageSquareIcon /> Add note
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 px-3 pb-3">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="e.g. only half a case left"
        maxLength={500}
        autoFocus
      />
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          className="min-h-[44px]"
          disabled={pending}
          onClick={() => start(() => saveNoteAction(entry.id, value).then(() => setOpen(false)))}
        >
          {pending ? <Loader2Icon className="size-4 animate-spin" /> : 'Save note'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-[44px]"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}

function EditEntryForm({
  entry,
  onDone,
}: {
  entry: PrepListEntryWithMeta
  onDone: () => void
}) {
  const [state, action, isPending] = useActionState<ListActionState, FormData>(
    updateEntryAction,
    null
  )
  const [unit, setUnit] = useState(entry.unit)
  const [starred, setStarred] = useState(entry.isStarred)

  useEffect(() => {
    if (state?.success) onDone()
  }, [state, onDone])

  return (
    <li className="rounded-lg border p-3">
      <form action={action} className="flex flex-col gap-3">
        <input type="hidden" name="entryId" value={entry.id} />
        <input type="hidden" name="isStarred" value={starred ? 'true' : 'false'} />
        {state?.error && (
          <div role="alert" className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            {state.error}
          </div>
        )}
        <div className="font-medium">{entry.itemName}</div>
        <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Qty</label>
            <Input
              type="text"
              inputMode="decimal"
              name="quantity"
              defaultValue={formatQuantity(entry.quantity)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Unit</label>
            <UnitSelect name="unit" value={unit} onValueChange={setUnit} />
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-11"
            aria-label="Mark as priority"
            aria-pressed={starred}
            onClick={() => setStarred((s) => !s)}
          >
            <StarIcon className={cn(starred && 'fill-current text-amber-500')} />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button type="submit" className="min-h-[44px] flex-1" disabled={isPending || !unit}>
            {isPending ? <Loader2Icon className="size-4 animate-spin" /> : 'Save'}
          </Button>
          <Button type="button" variant="outline" className="min-h-[44px]" onClick={onDone}>
            Cancel
          </Button>
        </div>
      </form>
    </li>
  )
}
