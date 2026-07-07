'use client'

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
  type Dispatch,
  type SetStateAction,
} from 'react'
import { CameraIcon, Loader2Icon, PlusIcon, SparklesIcon, XIcon } from 'lucide-react'
import {
  createRecipeAction,
  updateRecipeAction,
  parseRecipeAction,
  scanRecipeAction,
  type RecipeActionState,
} from '../actions'
import type { RecipeIngredient } from '@/lib/db/queries/recipes'
import { downscaleToJpegBase64 } from '@/lib/images/downscale'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useT } from '@/lib/i18n/client'

type Parsed = { ingredients: RecipeIngredient[]; instructions: { text: string }[] }

export const emptyIngredient = (): RecipeIngredient => ({ name: '', quantity: '', unit: '' })

// Serializes builder state into the JSON the actions parse — blank rows dropped so
// trailing empties don't trip validation. Shared with the inline create-item flow.
export function serializeRecipe(ingredients: RecipeIngredient[], steps: string[]): string {
  return JSON.stringify({
    ingredients: ingredients
      .map((i) => ({ name: i.name.trim(), quantity: i.quantity.trim(), unit: i.unit.trim() }))
      .filter((i) => i.name),
    instructions: steps.map((s) => ({ text: s.trim() })).filter((s) => s.text),
  })
}

// The recipe builder itself (scan / paste / manual), controlled by the parent. Reused
// by both the recipe page (RecipeEditor) and the inline "add recipe while creating an
// item" flow, so neither has its own copy of the ingredient/step UI.
export function RecipeFields({
  ingredients,
  setIngredients,
  steps,
  setSteps,
}: {
  ingredients: RecipeIngredient[]
  setIngredients: Dispatch<SetStateAction<RecipeIngredient[]>>
  steps: string[]
  setSteps: Dispatch<SetStateAction<string[]>>
}) {
  const { dict, t } = useT()

  const setIngredient = (idx: number, patch: Partial<RecipeIngredient>) =>
    setIngredients((list) => list.map((ing, i) => (i === idx ? { ...ing, ...patch } : ing)))

  // Shared by paste + scan: fill the builder from an extracted recipe.
  const applyParsed = (parsed: Parsed) => {
    setIngredients(parsed.ingredients.length ? parsed.ingredients : [emptyIngredient()])
    setSteps(parsed.instructions.length ? parsed.instructions.map((s) => s.text) : [''])
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <ScanPanel onParsed={applyParsed} />
        <PastePanel onParsed={applyParsed} />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">{dict.recipes.ingredientsHeading}</h2>
        {ingredients.map((ing, i) => (
          <div key={i} className="grid grid-cols-[1fr_auto] items-end gap-2">
            <Field name={`ingredient-name-${i}`}>
              <FieldLabel>{dict.recipes.ingredientName}</FieldLabel>
              <Input
                type="text"
                value={ing.name}
                onChange={(e) => setIngredient(i, { name: e.target.value })}
                placeholder={dict.recipes.ingredientNamePlaceholder}
                spellCheck
              />
            </Field>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11"
              aria-label={dict.recipes.removeIngredientAria}
              onClick={() =>
                setIngredients((list) =>
                  list.length > 1 ? list.filter((_, idx) => idx !== i) : list
                )
              }
            >
              <XIcon />
            </Button>
            <div className="col-span-2 grid grid-cols-2 gap-2">
              <Field name={`ingredient-qty-${i}`}>
                <FieldLabel>{dict.recipes.quantity}</FieldLabel>
                <Input
                  type="text"
                  value={ing.quantity}
                  onChange={(e) => setIngredient(i, { quantity: e.target.value })}
                  placeholder="2"
                />
              </Field>
              <Field name={`ingredient-unit-${i}`}>
                <FieldLabel>{dict.recipes.unit}</FieldLabel>
                <Input
                  type="text"
                  value={ing.unit}
                  onChange={(e) => setIngredient(i, { unit: e.target.value })}
                  placeholder="cup"
                />
              </Field>
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-[44px] self-start"
          onClick={() => setIngredients((list) => [...list, emptyIngredient()])}
        >
          <PlusIcon /> {dict.recipes.addIngredient}
        </Button>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">{dict.recipes.stepsHeading}</h2>
        {steps.map((step, i) => (
          <div key={i} className="flex items-end gap-2">
            <Field name={`step-${i}`} className="flex-1">
              <FieldLabel>{t(dict.recipes.step, { n: i + 1 })}</FieldLabel>
              <Textarea
                value={step}
                onChange={(e) =>
                  setSteps((list) => list.map((s, idx) => (idx === i ? e.target.value : s)))
                }
                placeholder={dict.recipes.stepPlaceholder}
                maxLength={2000}
                spellCheck
              />
            </Field>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11"
              aria-label={dict.recipes.removeStepAria}
              onClick={() =>
                setSteps((list) => (list.length > 1 ? list.filter((_, idx) => idx !== i) : list))
              }
            >
              <XIcon />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-[44px] self-start"
          onClick={() => setSteps((list) => [...list, ''])}
        >
          <PlusIcon /> {dict.recipes.addStep}
        </Button>
      </section>
    </div>
  )
}

export function RecipeEditor({
  itemId,
  recipeId,
  initialIngredients,
  initialSteps,
  onCancel,
}: {
  itemId: string
  recipeId?: string
  initialIngredients: RecipeIngredient[]
  initialSteps: string[]
  onCancel?: () => void
}) {
  const { dict } = useT()
  const [state, action, isPending] = useActionState<RecipeActionState, FormData>(
    recipeId ? updateRecipeAction : createRecipeAction,
    null
  )
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(
    initialIngredients.length ? initialIngredients : [emptyIngredient()]
  )
  const [steps, setSteps] = useState<string[]>(initialSteps.length ? initialSteps : [''])

  // On a successful save the route revalidates and re-renders; flip back to the
  // read-only view (edit mode) — mirrors EditItemForm's onDone pattern.
  useEffect(() => {
    if (state?.success) onCancel?.()
  }, [state, onCancel])

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="itemId" value={itemId} />
      {recipeId && <input type="hidden" name="recipeId" value={recipeId} />}
      <input type="hidden" name="recipe" value={serializeRecipe(ingredients, steps)} />
      {state?.error && (
        <div role="alert" className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <RecipeFields
        ingredients={ingredients}
        setIngredients={setIngredients}
        steps={steps}
        setSteps={setSteps}
      />

      <div className="flex gap-2">
        <Button type="submit" className="min-h-[48px] flex-1 text-base" disabled={isPending}>
          {isPending ? <Loader2Icon className="size-4 animate-spin" /> : dict.recipes.saveRecipe}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" className="min-h-[48px]" onClick={onCancel}>
            {dict.common.cancel}
          </Button>
        )}
      </div>
    </form>
  )
}

// Snap/upload a photo → scanRecipeAction (Claude vision) → fills the form for review.
// Mirrors PastePanel; never blocks manual entry. The image is downscaled + JPEG-
// re-encoded client-side (normalizes HEIC, shrinks payload) before upload, and is
// used inline by the model — never stored.
function ScanPanel({ onParsed }: { onParsed: (parsed: Parsed) => void }) {
  const { dict } = useT()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [pending, start] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file
    if (!file) return
    start(async () => {
      setError(null)
      setDone(false)
      let img
      try {
        img = await downscaleToJpegBase64(file)
      } catch (err) {
        setError(
          err instanceof Error && err.message === 'IMAGE_TOO_LARGE'
            ? dict.errors.recipes.scanTooLarge
            : dict.errors.recipes.scanImageInvalid
        )
        return
      }
      const res = await scanRecipeAction({ imageBase64: img.base64, mediaType: img.mediaType })
      if (res.error || !res.data) {
        setError(res.error ?? dict.errors.recipes.scanFailed)
        return
      }
      onParsed(res.data)
      setDone(true)
    })
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        className="min-h-[48px] justify-start text-base"
        onClick={() => setOpen(true)}
      >
        <CameraIcon /> {dict.recipes.scanHeading}
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">{dict.recipes.scanHeading}</h2>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9"
          aria-label={dict.common.close}
          onClick={() => setOpen(false)}
        >
          <XIcon />
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">{dict.recipes.scanHelp}</p>
      {error && (
        <div role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      {done && !error && (
        <div className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
          {dict.recipes.scanReview}
        </div>
      )}
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
        className="min-h-[48px]"
        disabled={pending}
        onClick={() => inputRef.current?.click()}
      >
        {pending ? (
          <>
            <Loader2Icon className="size-4 animate-spin" /> {dict.recipes.scanning}
          </>
        ) : (
          <>
            <CameraIcon className="size-4" /> {dict.recipes.scanButton}
          </>
        )}
      </Button>
    </div>
  )
}

// Paste raw recipe text → parseRecipeAction (LLM) → fills the form for review.
// Never blocks manual entry: a parse failure just shows an error and leaves the
// form as-is.
function PastePanel({ onParsed }: { onParsed: (parsed: Parsed) => void }) {
  const { dict } = useT()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [pending, start] = useTransition()

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        className="min-h-[48px] justify-start text-base"
        onClick={() => setOpen(true)}
      >
        <SparklesIcon /> {dict.recipes.pasteHeading}
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">{dict.recipes.pasteHeading}</h2>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9"
          aria-label={dict.common.close}
          onClick={() => setOpen(false)}
        >
          <XIcon />
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">{dict.recipes.pasteHelp}</p>
      {error && (
        <div role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      {done && !error && (
        <div className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
          {dict.recipes.parseReview}
        </div>
      )}
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={dict.recipes.pastePlaceholder}
        rows={6}
        maxLength={10000}
      />
      <Button
        type="button"
        className="min-h-[48px]"
        disabled={pending || !text.trim()}
        onClick={() =>
          start(async () => {
            setError(null)
            setDone(false)
            const res = await parseRecipeAction(text)
            if (res.error || !res.data) {
              setError(res.error ?? dict.errors.recipes.parseFailed)
              return
            }
            onParsed(res.data)
            setDone(true)
          })
        }
      >
        {pending ? (
          <>
            <Loader2Icon className="size-4 animate-spin" /> {dict.recipes.parsing}
          </>
        ) : (
          dict.recipes.parseButton
        )}
      </Button>
    </div>
  )
}
