'use client'

import { useActionState, useEffect, useState } from 'react'
import { Loader2Icon, PlusIcon, StarIcon } from 'lucide-react'
import { addEntryAction, type ListActionState } from '../../actions'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { UnitSelect } from '@/components/unit-select'
import {
  SelectField,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export function AddEntryRow({
  listId,
  items,
}: {
  listId: string
  items: { id: string; name: string }[]
}) {
  const [state, action, isPending] = useActionState<ListActionState, FormData>(addEntryAction, null)
  const [itemId, setItemId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('')
  const [starred, setStarred] = useState(false)

  useEffect(() => {
    if (state?.success) {
      setItemId('')
      setQuantity('')
      setUnit('')
      setStarred(false)
    }
  }, [state])

  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        Add items to your catalog first, then build the list.
      </p>
    )
  }

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
        <SelectField value={itemId} onValueChange={(v) => setItemId(v ?? '')}>
          <SelectTrigger>
            <SelectValue placeholder="Select item" />
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
