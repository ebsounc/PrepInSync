'use client'

import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { BookOpenIcon, CameraIcon, Loader2Icon, PencilIcon, PlusIcon, Trash2Icon, XIcon } from 'lucide-react'
import {
  createItemAction,
  updateItemAction,
  deleteItemAction,
  setItemImageAction,
  removeItemImageAction,
  type ItemActionState,
} from '../actions'
import { addCustomUnitAction } from '../../_actions/units'
import {
  RecipeFields,
  emptyIngredient,
  serializeRecipe,
} from '../[id]/recipe/_components/recipe-editor'
import type { PrepItemDisplay } from '@/lib/translation/apply'
import type { RecipeIngredient } from '@/lib/db/queries/recipes'
import { downscaleToJpegBase64 } from '@/lib/images/downscale'
import { formatAmount } from '@/lib/units'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { UnitSelect } from '@/components/unit-select'
import { TranslationCorrections, type Correctable } from '@/components/translation-corrections'
import { useT } from '@/lib/i18n/client'
import { normalizeForSearch } from '@/lib/utils'

export function ItemsList({
  items,
  canManage,
  customUnits,
  customUnitLabels,
  recipeItemIds,
  itemImageUrls,
  lang,
}: {
  items: PrepItemDisplay[]
  canManage: boolean
  customUnits: string[]
  customUnitLabels: Record<string, string>
  recipeItemIds: string[]
  itemImageUrls: Record<string, string>
  lang: 'en' | 'es'
}) {
  const recipeItems = new Set(recipeItemIds)
  const { dict } = useT()
  // Open inline when the catalog is empty; otherwise collapse to a button so the
  // list isn't pushed down by the form (and we avoid deeply nested dropdowns).
  const [expanded, setExpanded] = useState(items.length === 0)
  // Client-side filter — matches the translated and source names (items already ship
  // in full, so this adds no payload or round-trip).
  const [filter, setFilter] = useState('')
  const q = normalizeForSearch(filter.trim())
  const filtered = q
    ? items.filter(
        (i) =>
          normalizeForSearch(i.nameDisplay).includes(q) ||
          normalizeForSearch(i.name).includes(q)
      )
    : items

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
      {items.length > 0 && (
        <Input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={dict.items.filterPlaceholder}
          aria-label={dict.items.filterPlaceholder}
        />
      )}
      {items.length === 0 ? (
        <p className="text-muted-foreground">
          {canManage ? dict.items.noItemsBuilder : dict.items.noItemsViewer}
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground">{dict.items.noItemsMatch}</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {filtered.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              canManage={canManage}
              customUnits={customUnits}
              customUnitLabels={customUnitLabels}
              hasRecipe={recipeItems.has(item.id)}
              imageUrl={itemImageUrls[item.id] ?? null}
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
  // Optional inline recipe (created together with the item on submit).
  const [showRecipe, setShowRecipe] = useState(false)
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([emptyIngredient()])
  const [steps, setSteps] = useState<string[]>([''])

  useEffect(() => {
    if (!state?.success) return
    setName('')
    setDescription('')
    setDefaultQty('')
    setDefaultUnit('')
    setShowPar(false)
    setParQty('')
    setParUnit('')
    setShowRecipe(false)
    setIngredients([emptyIngredient()])
    setSteps([''])
  }, [state])

  return (
    <form action={action} className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm">
      <h2 className="font-medium">{dict.items.addItemHeading}</h2>
      {state?.error && <ErrorBanner message={state.error} />}
      {/* Recipe travels with the item; only submitted when the section is open. */}
      {showRecipe && (
        <input type="hidden" name="recipe" value={serializeRecipe(ingredients, steps)} />
      )}
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
      {showRecipe && (
        <div className="flex flex-col gap-3 rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">{dict.recipes.recipeHeading}</h3>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9"
              aria-label={dict.common.remove}
              onClick={() => setShowRecipe(false)}
            >
              <XIcon />
            </Button>
          </div>
          <RecipeFields
            ingredients={ingredients}
            setIngredients={setIngredients}
            steps={steps}
            setSteps={setSteps}
          />
        </div>
      )}
      {showPar && (
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
      )}
      {/* Collapsed "add" affordances share a row so they don't stack with dead space. */}
      {(!showPar || !showRecipe) && (
        <div className="flex flex-wrap gap-2">
          {!showRecipe && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-[44px] flex-1"
              onClick={() => setShowRecipe(true)}
            >
              <PlusIcon /> {dict.recipes.addRecipe}
            </Button>
          )}
          {!showPar && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-[44px] flex-1"
              onClick={() => setShowPar(true)}
            >
              <PlusIcon /> {dict.items.addParLevel}
            </Button>
          )}
        </div>
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
  imageUrl,
  lang,
}: {
  item: PrepItemDisplay
  canManage: boolean
  customUnits: string[]
  customUnitLabels: Record<string, string>
  hasRecipe: boolean
  imageUrl: string | null
  lang: 'en' | 'es'
}) {
  const { dict, t } = useT()
  const [editing, setEditing] = useState(false)
  // Swap a custom-unit label for its translation; built-ins pass through and get
  // translated by formatAmount via lang.
  const unitLabel = (u: string | null) => (u && customUnitLabels[u]) || u

  if (editing) {
    return (
      <EditItemForm
        item={item}
        customUnits={customUnits}
        imageUrl={imageUrl}
        onDone={() => setEditing(false)}
      />
    )
  }

  // Cooks only see a link when a recipe exists; builders also get "Add recipe".
  const showRecipeLink = hasRecipe || canManage

  return (
    <li className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-2 px-3.5 py-3">
        <div className="flex min-w-0 items-center gap-3">
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- signed URL, not optimizable
            <img
              src={imageUrl}
              alt={t(dict.items.photoAlt, { name: item.name })}
              className="size-12 shrink-0 rounded-md border object-cover"
            />
          )}
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
          className="flex min-h-[44px] items-center gap-1.5 border-t px-3.5 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
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

// Thumbnail preview + add/replace/remove, shown in the item edit form. Downscales
// client-side; the action uploads to Storage + stores the path, then revalidatePath
// re-renders the list with the fresh signed URL.
function ItemPhotoControl({
  itemId,
  name,
  imageUrl,
}: {
  itemId: string
  name: string
  imageUrl: string | null
}) {
  const { dict, t } = useT()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    start(async () => {
      setError(null)
      let img
      try {
        img = await downscaleToJpegBase64(file)
      } catch (err) {
        setError(
          err instanceof Error && err.message === 'IMAGE_TOO_LARGE'
            ? dict.errors.items.imageTooLarge
            : dict.errors.items.imageInvalid
        )
        return
      }
      const res = await setItemImageAction(itemId, { imageBase64: img.base64, mediaType: img.mediaType })
      if (res.error) setError(res.error)
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed URL, not optimizable
          <img
            src={imageUrl}
            alt={t(dict.items.photoAlt, { name })}
            className="size-16 shrink-0 rounded-md border object-cover"
          />
        ) : (
          <div className="flex size-16 shrink-0 items-center justify-center rounded-md border text-muted-foreground">
            <CameraIcon className="size-5" />
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onFile}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-[44px]"
            disabled={pending}
            onClick={() => inputRef.current?.click()}
          >
            {pending ? <Loader2Icon className="size-4 animate-spin" /> : <CameraIcon className="size-4" />}{' '}
            {imageUrl ? dict.items.replacePhoto : dict.items.addPhoto}
          </Button>
          {imageUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-[44px] text-destructive"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  setError(null)
                  const res = await removeItemImageAction(itemId)
                  if (res.error) setError(res.error)
                })
              }
            >
              <XIcon className="size-4" /> {dict.items.removePhoto}
            </Button>
          )}
        </div>
      </div>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  )
}

function EditItemForm({
  item,
  customUnits,
  imageUrl,
  onDone,
}: {
  item: PrepItemDisplay
  customUnits: string[]
  imageUrl: string | null
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
    <form action={action} className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm">
      <input type="hidden" name="id" value={item.id} />
      {state?.error && <ErrorBanner message={state.error} />}
      <ItemPhotoControl itemId={item.id} name={item.name} imageUrl={imageUrl} />
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
