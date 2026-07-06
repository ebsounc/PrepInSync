'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { BookOpenIcon, Loader2Icon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import {
  createItemAction,
  updateItemAction,
  deleteItemAction,
  type ItemActionState,
} from '../actions'
import { addCustomUnitAction } from '../../_actions/units'
import type { PrepItemDisplay } from '@/lib/translation/apply'
import { formatAmount } from '@/lib/units'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { UnitSelect } from '@/components/unit-select'
import { TranslationCorrections, type Correctable } from '@/components/translation-corrections'
import { useT } from '@/lib/i18n/client'

export function ItemsList({
  items,
  canManage,
  customUnits,
  customUnitLabels,
  recipeItemIds,
  lang,
}: {
  items: PrepItemDisplay[]
  canManage: boolean
  customUnits: string[]
  customUnitLabels: Record<string, string>
  recipeItemIds: string[]
  lang: 'en' | 'es'
}) {
  const recipeItems = new Set(recipeItemIds)
  const { dict } = useT()
  // Open inline when the catalog is empty; otherwise collapse to a button so the
  // list isn't pushed down by the form (and we avoid deeply nested dropdowns).
  const [expanded, setExpanded] = useState(items.length === 0)

  // Translated fields the viewer could correct (only when actually translated).
  const corrections: Correctable[] = []
  for (const item of items) {
    if (item.sourceLanguage === lang) continue
    corrections.push({
      entityType: 'prep_item',
      entityId: item.id,
      field: 'name',
      label: dict.corrections.fields.item,
      sourceText: item.name,
      sourceLanguage: item.sourceLanguage,
      currentTranslation: item.nameDisplay,
    })
    if (item.description && item.descriptionDisplay) {
      corrections.push({
        entityType: 'prep_item',
        entityId: item.id,
        field: 'description',
        label: dict.corrections.fields.description,
        sourceText: item.description,
        sourceLanguage: item.sourceLanguage,
        currentTranslation: item.descriptionDisplay,
      })
    }
  }

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
            <PlusIcon /> {dict.items.addItem}
          </Button>
        ))}
      {items.length === 0 ? (
        <p className="text-muted-foreground">
          {canManage ? dict.items.noItemsBuilder : dict.items.noItemsViewer}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              canManage={canManage}
              customUnits={customUnits}
              customUnitLabels={customUnitLabels}
              hasRecipe={recipeItems.has(item.id)}
              lang={lang}
            />
          ))}
        </ul>
      )}
      <TranslationCorrections items={corrections} targetLanguage={lang} />
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
  const { dict } = useT()
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
        <label className="text-sm font-medium text-foreground">{dict.prepLists.unit}</label>
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
  const { dict } = useT()
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
      <h2 className="font-medium">{dict.items.addItemHeading}</h2>
      {state?.error && <ErrorBanner message={state.error} />}
      <Field name="name">
        <FieldLabel>{dict.items.name}</FieldLabel>
        <Input
          type="text"
          name="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={dict.items.namePlaceholder}
          spellCheck
        />
      </Field>
      <Field name="description">
        <FieldLabel>{dict.items.description}</FieldLabel>
        <Textarea
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={dict.items.descriptionPlaceholder}
          maxLength={500}
          spellCheck
        />
      </Field>
      <AmountFields
        label={dict.items.defaultAmount}
        quantityName="defaultQuantity"
        unitName="defaultUnit"
        quantity={defaultQty}
        onQuantity={setDefaultQty}
        unit={defaultUnit}
        onUnit={setDefaultUnit}
        placeholder={dict.items.defaultAmountPlaceholder}
        customUnits={customUnits}
      />
      {showPar ? (
        <AmountFields
          label={dict.items.parLevel}
          quantityName="parQuantity"
          unitName="parUnit"
          quantity={parQty}
          onQuantity={setParQty}
          unit={parUnit}
          onUnit={setParUnit}
          placeholder={dict.items.parLevelPlaceholder}
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
          <PlusIcon /> {dict.items.addParLevel}
        </Button>
      )}
      <div className="flex gap-2">
        <Button type="submit" className="min-h-[48px] flex-1 text-base" disabled={isPending}>
          {isPending ? <Loader2Icon className="size-4 animate-spin" /> : dict.items.addItemSubmit}
        </Button>
        {onClose && (
          <Button type="button" variant="outline" className="min-h-[48px]" onClick={onClose}>
            {dict.items.doneClose}
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
  customUnitLabels,
  hasRecipe,
  lang,
}: {
  item: PrepItemDisplay
  canManage: boolean
  customUnits: string[]
  customUnitLabels: Record<string, string>
  hasRecipe: boolean
  lang: 'en' | 'es'
}) {
  const { dict, t } = useT()
  const [editing, setEditing] = useState(false)
  // Swap a custom-unit label for its translation; built-ins pass through and get
  // translated by formatAmount via lang.
  const unitLabel = (u: string | null) => (u && customUnitLabels[u]) || u

  if (editing) {
    return <EditItemForm item={item} customUnits={customUnits} onDone={() => setEditing(false)} />
  }

  // Cooks only see a link when a recipe exists; builders also get "Add recipe".
  const showRecipeLink = hasRecipe || canManage

  return (
    <li className="flex flex-col rounded-lg border">
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <div className="min-w-0">
          <div className="truncate font-medium">{item.nameDisplay}</div>
          {item.descriptionDisplay && (
            <div className="truncate text-sm text-muted-foreground">{item.descriptionDisplay}</div>
          )}
          {item.defaultQuantity && (
            <div className="text-sm text-muted-foreground">
              {dict.items.defaultLabel}: {formatAmount(item.defaultQuantity, unitLabel(item.defaultUnit), lang)}
            </div>
          )}
          {item.parQuantity && (
            <div className="text-sm text-muted-foreground">
              {dict.items.parLabel}: {formatAmount(item.parQuantity, unitLabel(item.parUnit), lang)}
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
              aria-label={t(dict.items.editAria, { name: item.name })}
              onClick={() => setEditing(true)}
            >
              <PencilIcon />
            </Button>
            <DeleteItemButton id={item.id} name={item.name} />
          </div>
        )}
      </div>
      {showRecipeLink && (
        <Link
          href={`/items/${item.id}/recipe`}
          className="flex min-h-[44px] items-center gap-1.5 border-t px-3 text-sm text-muted-foreground hover:text-foreground"
        >
          <BookOpenIcon className="size-4" />
          {hasRecipe ? dict.recipes.viewRecipe : dict.recipes.addRecipe}
        </Link>
      )}
    </li>
  )
}

function DeleteItemButton({ id, name }: { id: string; name: string }) {
  const { dict, t } = useT()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="flex flex-col items-end">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-11"
        aria-label={t(dict.items.deleteAria, { name })}
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
  item: PrepItemDisplay
  customUnits: string[]
  onDone: () => void
}) {
  const { dict } = useT()
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
        <FieldLabel>{dict.items.name}</FieldLabel>
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
        <FieldLabel>{dict.items.description}</FieldLabel>
        <Textarea
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={dict.items.descriptionPlaceholder}
          maxLength={500}
          spellCheck
        />
      </Field>
      <AmountFields
        label={dict.items.defaultAmount}
        quantityName="defaultQuantity"
        unitName="defaultUnit"
        quantity={defaultQty}
        onQuantity={setDefaultQty}
        unit={defaultUnit}
        onUnit={setDefaultUnit}
        placeholder={dict.items.defaultAmountPlaceholder}
        customUnits={customUnits}
      />
      {showPar ? (
        <AmountFields
          label={dict.items.parLevel}
          quantityName="parQuantity"
          unitName="parUnit"
          quantity={parQty}
          onQuantity={setParQty}
          unit={parUnit}
          onUnit={setParUnit}
          placeholder={dict.items.parLevelPlaceholder}
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
          <PlusIcon /> {dict.items.addParLevel}
        </Button>
      )}
      <div className="flex gap-2">
        <Button type="submit" className="min-h-[48px] flex-1" disabled={isPending}>
          {isPending ? <Loader2Icon className="size-4 animate-spin" /> : dict.common.save}
        </Button>
        <Button type="button" variant="outline" className="min-h-[48px]" onClick={onDone}>
          {dict.common.cancel}
        </Button>
      </div>
    </form>
  )
}
