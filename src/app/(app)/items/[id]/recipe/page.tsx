import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeftIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getProfileByUserId } from '@/lib/db/queries/profiles'
import { getPrepItemById } from '@/lib/db/queries/prep-items'
import { getRecipeByItemId } from '@/lib/db/queries/recipes'
import { translatePrepItems, translateRecipe, getCustomUnitLabelMap } from '@/lib/translation/apply'
import { getDictionary, interpolate } from '@/lib/i18n'
import { TranslationCorrections, type Correctable } from '@/components/translation-corrections'
import { RecipeView } from './_components/recipe-view'
import { RecipeEditor } from './_components/recipe-editor'

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profile = await getProfileByUserId(user.id)
  if (!profile?.restaurantId) redirect('/onboarding')

  const item = await getPrepItemById(id, profile.restaurantId)
  if (!item) notFound()

  const lang = profile.preferredLanguage
  const canManage = profile.canCreateLists
  const dict = getDictionary(lang)

  const [recipe, customUnitLabels, [itemDisplay]] = await Promise.all([
    getRecipeByItemId(item.id, profile.restaurantId),
    getCustomUnitLabelMap(profile.restaurantId, lang),
    translatePrepItems([item], profile.restaurantId, lang),
  ])
  const itemName = itemDisplay?.nameDisplay ?? item.name

  const translatedRecipe = recipe
    ? await translateRecipe(recipe, profile.restaurantId, lang, customUnitLabels)
    : null

  // Translated ingredient names / step texts the viewer could correct.
  const corrections: Correctable[] = []
  if (translatedRecipe && translatedRecipe.sourceLanguage !== lang) {
    translatedRecipe.ingredients.forEach((ing, i) => {
      const display = translatedRecipe.ingredientsDisplay[i]
      // Skip when the translation equals the source (LLM fell back) — offering a
      // "fix this" with identical text on both sides is just confusing.
      if (ing.name && display?.name && display.name !== ing.name) {
        corrections.push({
          entityType: 'recipe',
          entityId: translatedRecipe.id,
          field: `ingredient:${i}:name`,
          label: dict.corrections.fields.ingredient,
          sourceText: ing.name,
          sourceLanguage: translatedRecipe.sourceLanguage,
          currentTranslation: display.name,
        })
      }
    })
    translatedRecipe.instructions.forEach((step, i) => {
      const display = translatedRecipe.instructionsDisplay[i]
      if (step.text && display?.text && display.text !== step.text) {
        corrections.push({
          entityType: 'recipe',
          entityId: translatedRecipe.id,
          field: `step:${i}:text`,
          label: dict.corrections.fields.step,
          sourceText: step.text,
          sourceLanguage: translatedRecipe.sourceLanguage,
          currentTranslation: display.text,
        })
      }
    })
  }

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <Link
        href="/items"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" /> {dict.recipes.back}
      </Link>
      <h1 className="mb-4 text-2xl font-semibold">
        {interpolate(dict.recipes.recipeFor, { item: itemName })}
      </h1>

      {translatedRecipe ? (
        <RecipeView recipe={translatedRecipe} itemId={item.id} canManage={canManage} lang={lang} />
      ) : canManage ? (
        <RecipeEditor itemId={item.id} initialIngredients={[]} initialSteps={[]} />
      ) : (
        <p className="text-muted-foreground">{dict.recipes.noRecipeViewer}</p>
      )}

      {corrections.length > 0 && (
        <div className="mt-6">
          <TranslationCorrections items={corrections} targetLanguage={lang} />
        </div>
      )}
    </div>
  )
}
