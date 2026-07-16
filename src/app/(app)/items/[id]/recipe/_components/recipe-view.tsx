'use client'

import { useRef, useState, useTransition } from 'react'
import { CameraIcon, Loader2Icon, PencilIcon, Trash2Icon, XIcon } from 'lucide-react'
import {
  deleteRecipeAction,
  setRecipeImageAction,
  removeRecipeImageAction,
} from '../actions'
import { RecipeEditor } from './recipe-editor'
import type { RecipeDisplay } from '@/lib/translation/apply'
import { downscaleToJpegBase64 } from '@/lib/images/downscale'
import { formatAmount } from '@/lib/units'
import { Button } from '@/components/ui/button'
import { useT } from '@/lib/i18n/client'

export function RecipeView({
  recipe,
  itemId,
  canManage,
  lang,
  coverUrl,
  hasOwnCover,
}: {
  recipe: RecipeDisplay
  itemId: string
  canManage: boolean
  lang: 'en' | 'es'
  coverUrl: string | null
  // Whether the recipe has its OWN cover photo (vs. showing the item's as a fallback) —
  // drives the "remove" control, which only clears the recipe's own photo.
  hasOwnCover: boolean
}) {
  const { dict } = useT()
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <RecipeEditor
        itemId={itemId}
        recipeId={recipe.id}
        // Editor edits the SOURCE text, not the translated display.
        initialIngredients={recipe.ingredients}
        initialSteps={recipe.instructions.map((s) => s.text ?? '')}
        onCancel={() => setEditing(false)}
      />
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- signed URL, not optimizable
        <img
          src={coverUrl}
          alt={dict.recipes.coverPhotoAlt}
          className="max-h-72 w-full rounded-xl border object-cover"
        />
      )}
      {canManage && (
        <CoverPhotoControl recipeId={recipe.id} itemId={itemId} hasCover={hasOwnCover} />
      )}

      <section>
        <h2 className="mb-2 font-medium">{dict.recipes.ingredientsHeading}</h2>
        <ul className="flex flex-col gap-1">
          {recipe.ingredientsDisplay.map((ing, i) => (
            <li key={i} className="flex gap-2 text-sm">
              <span className="shrink-0 text-muted-foreground">
                {formatAmount(ing.quantity, ing.unitDisplay || null, lang)}
              </span>
              <span>{ing.name}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 font-medium">{dict.recipes.stepsHeading}</h2>
        <ol className="flex flex-col gap-2">
          {recipe.instructionsDisplay.map((step, i) => (
            <li key={i} className="flex gap-2 text-sm">
              <span className="shrink-0 font-medium text-muted-foreground">{i + 1}.</span>
              <span className="whitespace-pre-wrap">{step.text}</span>
            </li>
          ))}
        </ol>
      </section>

      {canManage && (
        <div className="flex gap-2 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            className="min-h-[48px]"
            onClick={() => setEditing(true)}
          >
            <PencilIcon /> {dict.recipes.editRecipe}
          </Button>
          <DeleteRecipeButton recipeId={recipe.id} itemId={itemId} />
        </div>
      )}
    </div>
  )
}

function DeleteRecipeButton({ recipeId, itemId }: { recipeId: string; itemId: string }) {
  const { dict } = useT()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        type="button"
        variant="ghost"
        className="min-h-[48px] text-destructive"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(dict.recipes.deleteConfirm)) return
          start(async () => {
            const res = await deleteRecipeAction(recipeId, itemId)
            setError(res.error ?? null)
          })
        }}
      >
        {pending ? <Loader2Icon className="size-4 animate-spin" /> : <Trash2Icon />}{' '}
        {dict.recipes.deleteRecipe}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  )
}

// Add / replace / remove the recipe's cover photo. Downscales client-side, then the
// action uploads to Storage and stores the path; revalidatePath re-renders the page
// with the fresh signed URL.
function CoverPhotoControl({
  recipeId,
  itemId,
  hasCover,
}: {
  recipeId: string
  itemId: string
  hasCover: boolean
}) {
  const { dict } = useT()
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
            ? dict.errors.recipes.imageTooLarge
            : dict.errors.recipes.imageInvalid
        )
        return
      }
      const res = await setRecipeImageAction(recipeId, itemId, {
        imageBase64: img.base64,
        mediaType: img.mediaType,
      })
      if (res.error) setError(res.error)
    })
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex gap-2">
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
          {pending ? <Loader2Icon className="animate-spin" /> : <CameraIcon />}
          {dict.recipes.changeCoverPhoto}
        </Button>
        {hasCover && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-[44px] text-destructive"
            disabled={pending}
            onClick={() =>
              start(async () => {
                setError(null)
                const res = await removeRecipeImageAction(recipeId, itemId)
                if (res.error) setError(res.error)
              })
            }
          >
            <XIcon className="size-4" /> {dict.recipes.removeCoverPhoto}
          </Button>
        )}
      </div>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  )
}
