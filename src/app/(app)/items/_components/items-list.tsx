'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import { Loader2Icon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import {
  createItemAction,
  updateItemAction,
  deleteItemAction,
  type ItemActionState,
} from '../actions'
import { addCustomUnitAction } from '../../_actions/units'
import type { PrepItem } from '@/lib/db/queries/prep-items'
import { formatAmount } from '@/lib/units'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { UnitSelect } from '@/components/unit-select'

export function ItemsList({
  items,
  canManage,
  customUnits,
}: {
  items: PrepItem[]
  canManage: boolean
  customUnits: string[]
}) {
  // Open inline when the catalog is empty; otherwise collapse to a button so the
  // list isn't pushed down by the form (and we avoid deeply nested dropdowns).
  const [expanded, setExpanded] = useState(items.length === 0)

  return (
    <div className="flex flex-col gap-5">
      {canManage &&
        (expanded ? (
          <AddItemForm
            customUnits={customUnits}
            onClose={items.length === 0 ? undefined : () => setExpanded(false)}
          />
        ) : (
          <Button
            type="button"
            variant="outline"
            className="min-h-[48px] justify-start text-base"
            onClick={() => setExpanded(true)}
          >
            <PlusIcon /> Add an item
          </Button>
        ))}
      {items.length === 0 ? (
        <p className="text-muted-foreground">
          {canManage ? 'No items yet. Add your first prep item above.' : 'No items yet.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <ItemRow key={item.id} item={item} canManage={canManage} customUnits={customUnits} />
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

// The amount + unit pair (Default amount, or Par level). Inputs are controlled so
// re-renders (e.g. when adding a custom unit) never trip base-ui's uncontrolled-field warning.
function AmountFields({
  label,
  quantityName,
  unitName,
  quantity,
  onQuantity,
  unit,
  onUnit,
  placeholder,
  customUnits,
}: {
  label: string
  quantityName: string
  unitName: string
  quantity: string
  onQuantity: (v: string) => void
  unit: string
  onUnit: (v: string) => void
  placeholder: string
  customUnits: string[]
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field name={quantityName}>
        <FieldLabel>{label}</FieldLabel>
        <Input
          type="text"
          inputMode="decimal"
          name={quantityName}
          value={quantity}
          onChange={(e) => onQuantity(e.target.value)}
          placeholder={placeholder}
        />
      </Field>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">Unit</label>
        <UnitSelect
          name={unitName}
          value={unit}
          onValueChange={onUnit}
          customUnits={customUnits}
          clearable
          onAddUnit={addCustomUnitAction}
        />
      </div>
    </div>
  )
}

function AddItemForm({ customUnits, onClose }: { customUnits: string[]; onClose?: () => void }) {
  const [state, action, isPending] = useActionState<ItemActionState, FormData>(createItemAction, null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [defaultQty, setDefaultQty] = useState('')
  const [defaultUnit, setDefaultUnit] = useState('')
  const [showPar, setShowPar] = useState(false)
  const [parQty, setParQty] = useState('')
  const [parUnit, setParUnit] = useState('')

  useEffect(() => {
    if (state?.success) {
      setName('')
      setDescription('')
      setDefaultQty('')
      setDefaultUnit('')
      setShowPar(false)
      setParQty('')
      setParUnit('')
    }
  }, [state])

  return (
    <form action={action} className="flex flex-col gap-3 rounded-xl border p-4">
      <h2 className="font-medium">Add an item</h2>
      {state?.error && <ErrorBanner message={state.error} />}
      <Field name="name">
        <FieldLabel>Name</FieldLabel>
        <Input
          type="text"
          name="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Diced onions"
          spellCheck
        />
      </Field>
      <Field name="description">
        <FieldLabel>Description (optional)</FieldLabel>
        <Textarea
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. stored in the walk-in, dice fine"
          maxLength={500}
          spellCheck
        />
      </Field>
      <AmountFields
        label="Default amount (optional)"
        quantityName="defaultQuantity"
        unitName="defaultUnit"
        quantity={defaultQty}
        onQuantity={setDefaultQty}
        unit={defaultUnit}
        onUnit={setDefaultUnit}
        placeholder="2"
        customUnits={customUnits}
      />
      {showPar ? (
        <AmountFields
          label="Par level (optional)"
          quantityName="parQuantity"
          unitName="parUnit"
          quantity={parQty}
          onQuantity={setParQty}
          unit={parUnit}
          onUnit={setParUnit}
          placeholder="6"
          customUnits={customUnits}
        />
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-[44px] self-start"
          onClick={() => setShowPar(true)}
        >
          <PlusIcon /> Add par level
        </Button>
      )}
      <div className="flex gap-2">
        <Button type="submit" className="min-h-[48px] flex-1 text-base" disabled={isPending}>
          {isPending ? <Loader2Icon className="size-4 animate-spin" /> : 'Add item'}
        </Button>
        {onClose && (
          <Button type="button" variant="outline" className="min-h-[48px]" onClick={onClose}>
            Done
          </Button>
        )}
      </div>
    </form>
  )
}

function ItemRow({
  item,
  canManage,
  customUnits,
}: {
  item: PrepItem
  canManage: boolean
  customUnits: string[]
}) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return <EditItemForm item={item} customUnits={customUnits} onDone={() => setEditing(false)} />
  }

  return (
    <li className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5">
      <div className="min-w-0">
        <div className="truncate font-medium">{item.name}</div>
        {item.description && (
          <div className="truncate text-sm text-muted-foreground">{item.description}</div>
        )}
        {item.defaultQuantity && (
          <div className="text-sm text-muted-foreground">
            Default: {formatAmount(item.defaultQuantity, item.defaultUnit)}
          </div>
        )}
        {item.parQuantity && (
          <div className="text-sm text-muted-foreground">
            Par: {formatAmount(item.parQuantity, item.parUnit)}
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

function EditItemForm({
  item,
  customUnits,
  onDone,
}: {
  item: PrepItem
  customUnits: string[]
  onDone: () => void
}) {
  const [state, action, isPending] = useActionState<ItemActionState, FormData>(updateItemAction, null)
  const num = (v: string | null) => (v ? Number(v).toString() : '')
  const [name, setName] = useState(item.name)
  const [description, setDescription] = useState(item.description ?? '')
  const [defaultQty, setDefaultQty] = useState(num(item.defaultQuantity))
  const [defaultUnit, setDefaultUnit] = useState(item.defaultUnit ?? '')
  const [showPar, setShowPar] = useState(Boolean(item.parQuantity))
  const [parQty, setParQty] = useState(num(item.parQuantity))
  const [parUnit, setParUnit] = useState(item.parUnit ?? '')

  useEffect(() => {
    if (state?.success) onDone()
  }, [state, onDone])

  return (
    <form action={action} className="flex flex-col gap-3 rounded-lg border p-3">
      <input type="hidden" name="id" value={item.id} />
      {state?.error && <ErrorBanner message={state.error} />}
      <Field name="name">
        <FieldLabel>Name</FieldLabel>
        <Input
          type="text"
          name="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          spellCheck
        />
      </Field>
      <Field name="description">
        <FieldLabel>Description (optional)</FieldLabel>
        <Textarea
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. stored in the walk-in, dice fine"
          maxLength={500}
          spellCheck
        />
      </Field>
      <AmountFields
        label="Default amount (optional)"
        quantityName="defaultQuantity"
        unitName="defaultUnit"
        quantity={defaultQty}
        onQuantity={setDefaultQty}
        unit={defaultUnit}
        onUnit={setDefaultUnit}
        placeholder="2"
        customUnits={customUnits}
      />
      {showPar ? (
        <AmountFields
          label="Par level (optional)"
          quantityName="parQuantity"
          unitName="parUnit"
          quantity={parQty}
          onQuantity={setParQty}
          unit={parUnit}
          onUnit={setParUnit}
          placeholder="6"
          customUnits={customUnits}
        />
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-[44px] self-start"
          onClick={() => setShowPar(true)}
        >
          <PlusIcon /> Add par level
        </Button>
      )}
      <div className="flex gap-2">
        <Button type="submit" className="min-h-[48px] flex-1" disabled={isPending}>
          {isPending ? <Loader2Icon className="size-4 animate-spin" /> : 'Save'}
        </Button>
        <Button type="button" variant="outline" className="min-h-[48px]" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
