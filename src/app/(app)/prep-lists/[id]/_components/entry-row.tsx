'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import {
  BookOpenIcon,
  CheckCircle2Icon,
  CircleIcon,
  Loader2Icon,
  MessageSquareIcon,
  PencilIcon,
  StarIcon,
  Trash2Icon,
} from 'lucide-react'
import {
  setCompletionAction,
  saveCookNoteAction,
  setStarAction,
  removeEntryAction,
  updateEntryAction,
  type ListActionState,
} from '../../actions'
import { addCustomUnitAction } from '../../../_actions/units'
import { enqueueCompletion } from '@/lib/offline/queue'
import type { PrepListEntryDisplay } from '@/lib/translation/apply'
import { formatAmount, formatQuantity } from '@/lib/units'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { UnitSelect } from '@/components/unit-select'
import { useT } from '@/lib/i18n/client'
import { cn } from '@/lib/utils'

export function EntryRow({
  entry,
  canManage,
  customUnits,
  customUnitLabels,
  hasRecipe,
  lang,
  currentUserId,
}: {
  entry: PrepListEntryDisplay
  canManage: boolean
  customUnits: string[]
  customUnitLabels: Record<string, string>
  hasRecipe: boolean
  lang: 'en' | 'es'
  currentUserId: string
}) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return <EditEntryForm entry={entry} customUnits={customUnits} onDone={() => setEditing(false)} />
  }
  return (
    <DisplayEntry
      entry={entry}
      canManage={canManage}
      customUnitLabels={customUnitLabels}
      hasRecipe={hasRecipe}
      lang={lang}
      currentUserId={currentUserId}
      onEdit={() => setEditing(true)}
    />
  )
}

function DisplayEntry({
  entry,
  canManage,
  customUnitLabels,
  hasRecipe,
  lang,
  currentUserId,
  onEdit,
}: {
  entry: PrepListEntryDisplay
  canManage: boolean
  customUnitLabels: Record<string, string>
  hasRecipe: boolean
  lang: 'en' | 'es'
  currentUserId: string
  onEdit: () => void
}) {
  const { dict, t } = useT()
  const displayUnit = customUnitLabels[entry.unit] ?? entry.unit

  // Optimistic completion: flip instantly, then persist. Offline the tap is queued and
  // replayed on reconnect. Server truth (after a synced revalidate) wins via the effect.
  const [completed, setCompleted] = useState(entry.completed)
  const [inFlight, setInFlight] = useState(false)
  useEffect(() => setCompleted(entry.completed), [entry.completed])

  function toggle() {
    const next = !completed
    setCompleted(next)
    // ownerId binds the intent to this user so a different user logged in on the same
    // device can't replay it under their identity (see OfflineManager drain).
    const item = {
      entryId: entry.id,
      completed: next,
      completedAt: new Date().toISOString(),
      ownerId: currentUserId,
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      enqueueCompletion(item)
      return
    }
    // Online: persist directly. Disable while in flight so a rapid second tap can't
    // race the first (out-of-order responses would fight the optimistic state). If the
    // request fails (dropped mid-flight), queue it — except a deleted entry.
    setInFlight(true)
    setCompletionAction(entry.id, next, item.completedAt)
      .then((res) => {
        if (res?.error && res.code !== 'entry_not_found') enqueueCompletion(item)
      })
      .catch(() => enqueueCompletion(item))
      .finally(() => setInFlight(false))
  }

  return (
    <li className={cn('overflow-hidden rounded-xl border shadow-sm', completed ? 'bg-muted/40' : 'bg-card')}>
      <div className="flex items-stretch">
        {/* The whole left region is the completion toggle — a big greasy-hands target. */}
        <button
          type="button"
          aria-pressed={completed}
          disabled={inFlight}
          onClick={toggle}
          className="flex min-h-[56px] flex-1 items-center gap-3 p-3 text-left"
        >
          {completed ? (
            <CheckCircle2Icon className="size-6 shrink-0 text-primary" />
          ) : (
            <CircleIcon className="size-6 shrink-0 text-muted-foreground" />
          )}
          <span className="min-w-0">
            <span
              className={cn(
                'flex items-center gap-1.5 font-medium',
                completed && 'text-muted-foreground line-through'
              )}
            >
              {/* Only for people without the StarToggle below — for them this is the
                  only priority signal. A manager reads the same state off the toggle,
                  so showing both would just be the same star twice. */}
              {entry.isStarred && !canManage && (
                <StarIcon className="size-4 shrink-0 fill-current text-amber-500" />
              )}
              <span className="truncate">{entry.itemNameDisplay}</span>
            </span>
            <span className="text-sm text-muted-foreground">
              {formatAmount(entry.quantity, displayUnit, lang)}
            </span>
          </span>
        </button>
        {canManage && (
          <div className="flex items-center p-2">
            <StarToggle entry={entry} />
          </div>
        )}
      </div>

      {completed && entry.completedByName && (
        <p className="px-3 pb-1 text-xs text-muted-foreground">
          {t(dict.prepLists.doneByName, { name: entry.completedByName })}
        </p>
      )}

      {/* Instructions: the builder's note, read-only here (edited via Edit). */}
      {entry.notesDisplay && (
        <p className="px-3 pb-1 text-sm">
          <span className="text-muted-foreground">{dict.prepLists.instructionsLabel}</span>{' '}
          {entry.notesDisplay}
        </p>
      )}

      <CookNoteSection entry={entry} currentUserId={currentUserId} />

      {hasRecipe && (
        <Link
          href={`/items/${entry.prepItemId}/recipe`}
          className="flex min-h-[44px] items-center gap-1.5 border-t px-3 text-sm text-muted-foreground hover:text-foreground"
        >
          <BookOpenIcon className="size-4" /> {dict.recipes.viewRecipe}
        </Link>
      )}

      {/* Icon-only: the pencil and trash read clearly on their own, and dropping the
          labels removes a row of clutter from every entry. Size kept at 48px so the
          touch target doesn't shrink with the label. */}
      {canManage && (
        <div className="flex gap-1 border-t px-2 py-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-12"
            aria-label={dict.common.edit}
            onClick={onEdit}
          >
            <PencilIcon />
          </Button>
          <RemoveEntryButton id={entry.id} />
        </div>
      )}
    </li>
  )
}

function StarToggle({ entry }: { entry: PrepListEntryDisplay }) {
  const { dict } = useT()
  const [pending, start] = useTransition()
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-11"
      aria-label={entry.isStarred ? dict.prepLists.removePriority : dict.prepLists.markPriority}
      aria-pressed={entry.isStarred}
      disabled={pending}
      onClick={() => start(() => setStarAction(entry.id, !entry.isStarred).then(() => {}))}
    >
      <StarIcon className={cn(entry.isStarred && 'fill-current text-amber-500')} />
    </Button>
  )
}

function RemoveEntryButton({ id }: { id: string }) {
  const { dict } = useT()
  const [pending, start] = useTransition()
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-12 text-destructive"
      aria-label={dict.common.remove}
      disabled={pending}
      onClick={() => start(() => removeEntryAction(id).then(() => {}))}
    >
      {pending ? <Loader2Icon className="size-4 animate-spin" /> : <Trash2Icon />}
    </Button>
  )
}

// The cook's own note — editable by anyone working the list, separate from the
// builder's instructions above. Attributed to whoever last wrote it.
function CookNoteSection({
  entry,
  currentUserId,
}: {
  entry: PrepListEntryDisplay
  currentUserId: string
}) {
  const { dict, t } = useT()
  const [open, setOpen] = useState(false)
  // Editor seeds from the viewer's-language text (cookNoteDisplay): you edit what
  // you read. On save, saveCookNoteAction re-stamps cook_note_by to the editor, so
  // the note's source language becomes the editor's — and it re-translates back for
  // the other language. Fully bidirectional.
  const [value, setValue] = useState(entry.cookNoteDisplay ?? '')
  const [pending, start] = useTransition()

  // "Your note" to the author; "<Name>'s note" to everyone else.
  const noteLabel =
    entry.cookNoteById === currentUserId
      ? dict.prepLists.yourNote
      : entry.cookNoteByName
        ? t(dict.prepLists.othersNote, { name: entry.cookNoteByName })
        : dict.prepLists.note

  if (!open) {
    return (
      <div className="px-3 pb-2">
        {entry.cookNote ? (
          <button
            type="button"
            onClick={() => {
              setValue(entry.cookNoteDisplay ?? '')
              setOpen(true)
            }}
            className="text-left text-sm underline-offset-2 hover:underline"
          >
            <span className="text-muted-foreground">{noteLabel}:</span> {entry.cookNoteDisplay}
          </button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-[48px]"
            onClick={() => {
              setValue('')
              setOpen(true)
            }}
          >
            <MessageSquareIcon /> {dict.prepLists.addYourNote}
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
        placeholder={dict.prepLists.cookNotePlaceholder}
        maxLength={500}
        spellCheck
        autoFocus
      />
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          className="min-h-[48px]"
          disabled={pending}
          onClick={() => start(() => saveCookNoteAction(entry.id, value).then(() => setOpen(false)))}
        >
          {pending ? <Loader2Icon className="size-4 animate-spin" /> : dict.prepLists.saveNote}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-[48px]"
          onClick={() => setOpen(false)}
        >
          {dict.common.cancel}
        </Button>
      </div>
    </div>
  )
}

function EditEntryForm({
  entry,
  customUnits,
  onDone,
}: {
  entry: PrepListEntryDisplay
  customUnits: string[]
  onDone: () => void
}) {
  const { dict } = useT()
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
    <li className="rounded-xl border bg-card p-4 shadow-sm">
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
            <label className="text-sm font-medium text-foreground">{dict.prepLists.qty}</label>
            <Input
              type="text"
              inputMode="decimal"
              name="quantity"
              defaultValue={formatQuantity(entry.quantity)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">{dict.prepLists.unit}</label>
            <UnitSelect
              name="unit"
              value={unit}
              onValueChange={setUnit}
              customUnits={customUnits}
              onAddUnit={addCustomUnitAction}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-11"
            aria-label={dict.prepLists.markPriority}
            aria-pressed={starred}
            onClick={() => setStarred((s) => !s)}
          >
            <StarIcon className={cn(starred && 'fill-current text-amber-500')} />
          </Button>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">
            {dict.prepLists.instructionsField}
          </label>
          <Textarea
            name="notes"
            defaultValue={entry.notes ?? ''}
            placeholder={dict.prepLists.instructionsPlaceholder}
            maxLength={500}
            spellCheck
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" className="min-h-[48px] flex-1" disabled={isPending || !unit}>
            {isPending ? <Loader2Icon className="size-4 animate-spin" /> : dict.common.save}
          </Button>
          <Button type="button" variant="outline" className="min-h-[48px]" onClick={onDone}>
            {dict.common.cancel}
          </Button>
        </div>
      </form>
    </li>
  )
}
