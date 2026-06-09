'use client'

import { useActionState, useEffect, useState } from 'react'
import { Loader2Icon, PencilIcon } from 'lucide-react'
import { updateListAction, type ListActionState } from '../../actions'
import { formatListDate } from '@/lib/format'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function EditListForm({
  list,
  titleDisplay,
  canManage,
}: {
  list: { id: string; title: string; date: string }
  // The viewer's-language title for the read-only header. The edit input keeps
  // editing the source `list.title` so saving never overwrites it with a translation.
  titleDisplay: string
  canManage: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(list.title)
  const [date, setDate] = useState(list.date)
  const [state, action, isPending] = useActionState<ListActionState, FormData>(updateListAction, null)

  useEffect(() => {
    if (state?.success) setEditing(false)
  }, [state])

  // Re-seed the controlled fields from the latest list each time the editor opens.
  function open() {
    setTitle(list.title)
    setDate(list.date)
    setEditing(true)
  }

  if (!editing) {
    return (
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <h1 className="truncate text-2xl font-semibold">{titleDisplay}</h1>
          {canManage && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 shrink-0"
              aria-label="Edit list name and date"
              onClick={open}
            >
              <PencilIcon />
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{formatListDate(list.date)}</p>
      </div>
    )
  }

  return (
    <form action={action} className="flex w-full flex-col gap-3">
      <input type="hidden" name="listId" value={list.id} />
      {state?.error && (
        <div role="alert" className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {state.error}
        </div>
      )}
      <Field name="title">
        <FieldLabel>Title</FieldLabel>
        <Input
          type="text"
          name="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          spellCheck
          autoFocus
        />
      </Field>
      <Field name="date">
        <FieldLabel>Date</FieldLabel>
        <Input
          type="date"
          name="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" className="min-h-[44px]" disabled={isPending}>
          {isPending ? <Loader2Icon className="size-4 animate-spin" /> : 'Save'}
        </Button>
        <Button type="button" variant="outline" className="min-h-[44px]" onClick={() => setEditing(false)}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
