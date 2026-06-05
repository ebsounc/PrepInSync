'use client'

import { useActionState, useEffect, useState } from 'react'
import { Loader2Icon, PlusIcon, StarIcon } from 'lucide-react'
import { addEntryAction, type ListActionState } from '../../actions'
import { addCustomUnitAction } from '../../../_actions/units'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { UnitSelect } from '@/components/unit-select'
import {
  SelectField,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { formatQuantity } from '@/lib/units'
import { cn } from '@/lib/utils'

export type BuilderItem = {
  id: string
  name: string
  parQuantity: string | null
  parUnit: string | null
}

export function AddEntryRow({
  listId,
  items,
  customUnits,
}: {
  listId: string
  items: BuilderItem[]
  customUnits: string[]
}) {
  const [state, action, isPending] = useActionState<ListActionState, FormData>(addEntryAction, null)
  const [itemId, setItemId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('')
  const [starred, setStarred] = useState(false)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (state?.success) {
      setItemId('')
      setQuantity('')
      setUnit('')
      setStarred(false)
      setNotes('')
    }
  }, [state])

  // Picking an item prefills qty/unit from its default amount (still editable).
  // Reset first so switching to an item with no default clears the previous values.
  function handleItemChange(id: string) {
    setItemId(id)
    const item = items.find((i) => i.id === id)
    setQuantity(item?.parQuantity ? formatQuantity(item.parQuantity) : '')
    setUnit(item?.parUnit ?? '')
  }

  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        Add items to your catalog first, then build the list.
      </p>
    )
  }

  const selectedName = items.find((i) => i.id === itemId)?.name

  return (
    <form action={action} className="flex flex-col gap-3 rounded-xl border p-4">
      <input type="hidden" name="prepListId" value={listId} />
      <input type="hidden" name="prepItemId" value={itemId} />
      <input type="hidden" name="isStarred" value={starred ? 'true' : 'false'} />
      {state?.error && (
        <div role="alert" className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {state.error}
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">Item</label>
        <SelectField value={itemId} onValueChange={(v) => handleItemChange(v ?? '')}>
          <SelectTrigger>
            {/* base-ui passes the raw id to the render fn; we show the item name
                instead (the function child overrides the placeholder prop). */}
            <SelectValue placeholder="Select item">{() => selectedName ?? 'Select item'}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {items.map((i) => (
              <SelectItem key={i.id} value={i.id}>
                {i.name}
              </SelectItem>
            ))}
          </SelectContent>
        </SelectField>
      </div>
      <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Qty</label>
          <Input
            type="text"
            inputMode="decimal"
            name="quantity"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="2"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Unit</label>
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
          aria-label="Mark as priority"
          aria-pressed={starred}
          onClick={() => setStarred((s) => !s)}
        >
          <StarIcon className={cn(starred && 'fill-current text-amber-500')} />
        </Button>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">Prep note (optional)</label>
        <Textarea
          name="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. dice fine, 1/4 inch"
          maxLength={500}
          spellCheck
        />
      </div>
      <Button
        type="submit"
        className="min-h-[48px]"
        disabled={isPending || !itemId || !quantity || !unit}
      >
        {isPending ? (
          <Loader2Icon className="size-4 animate-spin" />
        ) : (
          <>
            <PlusIcon /> Add to list
          </>
        )}
      </Button>
    </form>
  )
}
