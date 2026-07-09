'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
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
import { useT } from '@/lib/i18n/client'
import { cn } from '@/lib/utils'

export type BuilderItem = {
  id: string
  name: string
  defaultQuantity: string | null
  defaultUnit: string | null
}

export function AddEntryRow({
  listId,
  items,
  customUnits,
  existingItemIds,
}: {
  listId: string
  items: BuilderItem[]
  customUnits: string[]
  existingItemIds: string[]
}) {
  const { dict } = useT()
  // Collapse to a button once the list has entries; open inline when empty.
  const [expanded, setExpanded] = useState(existingItemIds.length === 0)

  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        {dict.prepLists.addItemsFirst}
      </p>
    )
  }

  if (!expanded) {
    return (
      <Button
        type="button"
        variant="outline"
        className="min-h-[48px] w-full justify-start text-base"
        onClick={() => setExpanded(true)}
      >
        <PlusIcon /> {dict.items.addItem}
      </Button>
    )
  }

  return (
    <AddEntryForm
      listId={listId}
      items={items}
      customUnits={customUnits}
      existingItemIds={existingItemIds}
      onClose={existingItemIds.length > 0 ? () => setExpanded(false) : undefined}
    />
  )
}

function AddEntryForm({
  listId,
  items,
  customUnits,
  existingItemIds,
  onClose,
}: {
  listId: string
  items: BuilderItem[]
  customUnits: string[]
  existingItemIds: string[]
  onClose?: () => void
}) {
  const { dict, t } = useT()
  const [state, action, isPending] = useActionState<ListActionState, FormData>(addEntryAction, null)
  const formRef = useRef<HTMLFormElement>(null)
  const [itemId, setItemId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('')
  const [starred, setStarred] = useState(false)
  const [notes, setNotes] = useState('')
  const [confirmDup, setConfirmDup] = useState(false)

  useEffect(() => {
    if (state?.success) {
      setItemId('')
      setQuantity('')
      setUnit('')
      setStarred(false)
      setNotes('')
      setConfirmDup(false)
    }
  }, [state])

  // Picking an item prefills qty/unit from its default amount (still editable).
  // Reset first so switching to an item with no default clears the previous values.
  function handleItemChange(id: string) {
    setItemId(id)
    setConfirmDup(false)
    const item = items.find((i) => i.id === id)
    setQuantity(item?.defaultQuantity ? formatQuantity(item.defaultQuantity) : '')
    setUnit(item?.defaultUnit ?? '')
  }

  const selectedName = items.find((i) => i.id === itemId)?.name
  const isDuplicate = Boolean(itemId) && existingItemIds.includes(itemId)
  const canAdd = Boolean(itemId && quantity && unit) && !isPending

  // Gate submission on a confirm when the item is already on the list.
  function attemptAdd() {
    if (!canAdd) return
    if (isDuplicate && !confirmDup) {
      setConfirmDup(true)
      return
    }
    formRef.current?.requestSubmit()
  }

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm">
      <input type="hidden" name="prepListId" value={listId} />
      <input type="hidden" name="prepItemId" value={itemId} />
      <input type="hidden" name="isStarred" value={starred ? 'true' : 'false'} />
      {state?.error && (
        <div role="alert" className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {state.error}
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">{dict.prepLists.item}</label>
        <SelectField value={itemId} onValueChange={(v) => handleItemChange(v ?? '')}>
          <SelectTrigger>
            {/* base-ui passes the raw id to the render fn; we show the item name
                instead (the function child overrides the placeholder prop). */}
            <SelectValue placeholder={dict.prepLists.selectItem}>
              {() => selectedName ?? dict.prepLists.selectItem}
            </SelectValue>
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
          <label className="text-sm font-medium text-foreground">{dict.prepLists.qty}</label>
          <Input
            type="text"
            inputMode="decimal"
            name="quantity"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder={dict.prepLists.qtyPlaceholder}
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
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={dict.prepLists.instructionsPlaceholder}
          maxLength={500}
          spellCheck
        />
      </div>

      {confirmDup ? (
        <div className="flex flex-col gap-2 rounded-lg bg-muted p-3 text-sm">
          <span className="font-medium">
            {t(dict.prepLists.alreadyOnList, { name: selectedName ?? '' })}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              className="min-h-[48px] flex-1"
              disabled={isPending}
              onClick={() => formRef.current?.requestSubmit()}
            >
              {isPending ? <Loader2Icon className="size-4 animate-spin" /> : dict.prepLists.addAgain}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-[48px]"
              onClick={() => setConfirmDup(false)}
            >
              {dict.common.cancel}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button type="button" className="min-h-[48px] flex-1" disabled={!canAdd} onClick={attemptAdd}>
            {isPending ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <>
                <PlusIcon /> {dict.prepLists.addToList}
              </>
            )}
          </Button>
          {onClose && (
            <Button type="button" variant="outline" className="min-h-[48px]" onClick={onClose}>
              {dict.common.close}
            </Button>
          )}
        </div>
      )}
    </form>
  )
}
