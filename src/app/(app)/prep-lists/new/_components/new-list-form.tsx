'use client'

import { useActionState } from 'react'
import { Loader2Icon } from 'lucide-react'
import { createListAction, type ListActionState } from '../../actions'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

// Local (not UTC) YYYY-MM-DD so the default date matches the user's calendar day.
function todayLocal() {
  const d = new Date()
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

export function NewListForm() {
  const [state, action, isPending] = useActionState<ListActionState, FormData>(
    createListAction,
    null
  )

  return (
    <form action={action} className="flex flex-col gap-4">
      {state?.error && (
        <div role="alert" className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {state.error}
        </div>
      )}
      <Field name="title">
        <FieldLabel>Title</FieldLabel>
        <Input type="text" name="title" required placeholder="e.g. Friday a.m. prep" autoFocus spellCheck />
      </Field>
      <Field name="date">
        <FieldLabel>Date</FieldLabel>
        <Input type="date" name="date" required defaultValue={todayLocal()} />
      </Field>
      <Button type="submit" className="min-h-[52px] text-base" disabled={isPending}>
        {isPending ? <Loader2Icon className="size-4 animate-spin" /> : 'Create list'}
      </Button>
    </form>
  )
}
