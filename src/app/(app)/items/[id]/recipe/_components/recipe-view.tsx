'use client'

import { useState, useTransition } from 'react'
import { Loader2Icon, PencilIcon, Trash2Icon } from 'lucide-react'
import { deleteRecipeAction } from '../actions'
import { RecipeEditor } from './recipe-editor'
import type { RecipeDisplay } from '@/lib/translation/apply'
import { formatAmount } from '@/lib/units'
import { Button } from '@/components/ui/button'
import { useT } from '@/lib/i18n/client'

export function RecipeView({
  recipe,
  itemId,
  canManage,
  lang,
}: {
  recipe: RecipeDisplay
  itemId: string
  canManage: boolean
  lang: 'en' | 'es'
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
