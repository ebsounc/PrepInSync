'use client'

import { useActionState } from 'react'
import { Loader2Icon } from 'lucide-react'
import { createListAction, type ListActionState } from '../../actions'
import { useT } from '@/lib/i18n/client'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

// defaultDate + titleHint come from the server (computed in the restaurant timezone),
// so the rendered values match on server and client — no hydration mismatch.
export function NewListForm({
  defaultDate,
  titleHint,
}: {
  defaultDate: string
  titleHint: string
}) {
  const { dict } = useT()
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
        <FieldLabel>{dict.prepLists.title}</FieldLabel>
        <Input type="text" name="title" required placeholder={titleHint} autoFocus spellCheck />
      </Field>
      <Field name="date">
        <FieldLabel>{dict.prepLists.date}</FieldLabel>
        <Input type="date" name="date" required defaultValue={defaultDate} />
      </Field>
      <Button type="submit" className="min-h-[52px] text-base" disabled={isPending}>
        {isPending ? <Loader2Icon className="size-4 animate-spin" /> : dict.prepLists.createList}
      </Button>
    </form>
  )
}
