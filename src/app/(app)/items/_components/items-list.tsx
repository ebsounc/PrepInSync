'use client'

import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
import { Loader2Icon, PencilIcon, Trash2Icon } from 'lucide-react'
import {
  createItemAction,
  updateItemAction,
  deleteItemAction,
  type ItemActionState,
} from '../actions'
import type { PrepItem } from '@/lib/db/queries/prep-items'
import { formatQuantity } from '@/lib/units'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { UnitSelect } from '@/components/unit-select'

export function ItemsList({ items, canManage }: { items: PrepItem[]; canManage: boolean }) {
  return (
    <div className="flex flex-col gap-5">
      {canManage && <AddItemForm />}
      {items.length === 0 ? (
        <p className="text-muted-foreground">
          {canManage ? 'No items yet. Add your first prep item above.' : 'No items yet.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <ItemRow key={item.id} item={item} canManage={canManage} />
          ))}
        </ul>
      )}
    </div>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
      {message}
    </div>
  )
}

function AddItemForm() {
  const [state, action, isPending] = useActionState<ItemActionState, FormData>(
    createItemAction,
    null
  )
  const [unit, setUnit] = useState('')
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset()
      setUnit('')
    }
  }, [state])

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-3 rounded-xl border p-4">
      <h2 className="font-medium">Add an item</h2>
      {state?.error && <ErrorBanner message={state.error} />}
      <Field name="name">
        <FieldLabel>Name</FieldLabel>
        <Input type="text" name="name" required placeholder="Diced onions" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field name="parQuantity">
          <FieldLabel>Par quantity (optional)</FieldLabel>
          <Input type="text" inputMode="decimal" name="parQuantity" placeholder="2" />
        </Field>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Par unit</label>
          <UnitSelect name="parUnit" value={unit} onValueChange={setUnit} />
        </div>
      </div>
      <Button type="submit" className="min-h-[48px] text-base" disabled={isPending}>
        {isPending ? <Loader2Icon className="size-4 animate-spin" /> : 'Add item'}
      </Button>
    </form>
  )
}

function ItemRow({ item, canManage }: { item: PrepItem; canManage: boolean }) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return <EditItemForm item={item} onDone={() => setEditing(false)} />
  }

  return (
    <li className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5">
      <div className="min-w-0">
        <div className="truncate font-medium">{item.name}</div>
        {item.parQuantity && (
          <div className="text-sm text-muted-foreground">
            Par: {formatQuantity(item.parQuantity)} {item.parUnit}
          </div>
        )}
      </div>
      {canManage && (
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11"
            aria-label={`Edit ${item.name}`}
            onClick={() => setEditing(true)}
          >
            <PencilIcon />
          </Button>
          <DeleteItemButton id={item.id} name={item.name} />
        </div>
      )}
    </li>
  )
}

function DeleteItemButton({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="flex flex-col items-end">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-11"
        aria-label={`Delete ${name}`}
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await deleteItemAction(id)
            setError(res.error ?? null)
          })
        }
      >
        {pending ? <Loader2Icon className="animate-spin" /> : <Trash2Icon className="text-destructive" />}
      </Button>
      {error && <span className="max-w-[12rem] text-right text-xs text-destructive">{error}</span>}
    </div>
  )
}

function EditItemForm({ item, onDone }: { item: PrepItem; onDone: () => void }) {
  const [state, action, isPending] = useActionState<ItemActionState, FormData>(
    updateItemAction,
    null
  )
  const [unit, setUnit] = useState(item.parUnit ?? '')

  useEffect(() => {
    if (state?.success) onDone()
  }, [state, onDone])

  return (
    <form action={action} className="flex flex-col gap-3 rounded-lg border p-3">
      <input type="hidden" name="id" value={item.id} />
      {state?.error && <ErrorBanner message={state.error} />}
      <Field name="name">
        <FieldLabel>Name</FieldLabel>
        <Input type="text" name="name" required defaultValue={item.name} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field name="parQuantity">
          <FieldLabel>Par quantity</FieldLabel>
          <Input
            type="text"
            inputMode="decimal"
            name="parQuantity"
            defaultValue={item.parQuantity ? formatQuantity(item.parQuantity) : ''}
          />
        </Field>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Par unit</label>
          <UnitSelect name="parUnit" value={unit} onValueChange={setUnit} />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" className="min-h-[44px] flex-1" disabled={isPending}>
          {isPending ? <Loader2Icon className="size-4 animate-spin" /> : 'Save'}
        </Button>
        <Button type="button" variant="outline" className="min-h-[44px]" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
