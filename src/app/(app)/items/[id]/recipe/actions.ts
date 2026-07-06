'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getProfileByUserId } from '@/lib/db/queries/profiles'
import { getPrepItemById } from '@/lib/db/queries/prep-items'
import {
  createRecipe,
  updateRecipe,
  deleteRecipe,
  hasRecipe,
  type RecipeIngredient,
  type RecipeStep,
} from '@/lib/db/queries/recipes'
import { parseRecipe, type ParsedRecipe } from '@/lib/ai'
import { getDictionary, resolveKey, type Dict } from '@/lib/i18n'
import { getActionDict } from '@/lib/i18n/server'

export type RecipeActionState = { error?: string; success?: boolean } | null

// Recipe units are FREE TEXT — deliberately NOT run through isValidUnit (a pasted
// recipe uses "cup"/"tbsp"/"clove" that aren't in the built-in set or the
// restaurant's custom units). See docs/database.md.
const ingredientSchema = z.object({
  name: z.string().trim().min(1, 'errors.recipes.ingredientNameRequired').max(200),
  quantity: z.string().trim().max(20).default(''),
  unit: z.string().trim().max(40).default(''),
})
const stepSchema = z.object({
  text: z.string().trim().min(1, 'errors.recipes.stepTextRequired').max(2000),
})
const recipeSchema = z.object({
  // Cap array length so a crafted payload can't write an unbounded JSONB blob or
  // fan out into a huge translation batch. Well above any real recipe.
  ingredients: z.array(ingredientSchema).min(1, 'errors.recipes.ingredientsRequired').max(100),
  instructions: z.array(stepSchema).min(1, 'errors.recipes.stepsRequired').max(100),
})

// Recipe authoring is gated on can_create_lists (the people who own the catalog).
async function requireBuilder() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: (await getActionDict()).errors.common.signInRequired }

  const profile = await getProfileByUserId(user.id)
  if (!profile || !profile.restaurantId || !profile.isActive) {
    return { error: (await getActionDict(profile?.preferredLanguage)).errors.common.noAccess }
  }
  if (!profile.canCreateLists) {
    return { error: getDictionary(profile.preferredLanguage).errors.recipes.noPermission }
  }
  return {
    profile,
    restaurantId: profile.restaurantId,
    dict: getDictionary(profile.preferredLanguage),
  }
}

// Ingredients/instructions arrive as a JSON string (variable-length arrays don't
// map cleanly to flat FormData). Parse + validate into the jsonb shape.
function parseRecipeForm(
  formData: FormData,
  dict: Dict
): { ingredients: RecipeIngredient[]; instructions: RecipeStep[] } | { error: string } {
  let raw: unknown
  try {
    raw = JSON.parse(String(formData.get('recipe') ?? ''))
  } catch {
    return { error: dict.errors.recipes.invalidRecipe }
  }
  const parsed = recipeSchema.safeParse(raw)
  if (!parsed.success) return { error: resolveKey(dict, parsed.error.issues[0].message) }
  return {
    ingredients: parsed.data.ingredients,
    instructions: parsed.data.instructions,
  }
}

export async function createRecipeAction(
  _prev: RecipeActionState,
  formData: FormData
): Promise<RecipeActionState> {
  const ctx = await requireBuilder()
  if ('error' in ctx) return { error: ctx.error }

  const itemId = z.string().uuid().safeParse(formData.get('itemId'))
  if (!itemId.success) return { error: ctx.dict.errors.recipes.itemNotFound }

  // Confirm the item is ours before writing a child recipe to it.
  const item = await getPrepItemById(itemId.data, ctx.restaurantId)
  if (!item) return { error: ctx.dict.errors.recipes.itemNotFound }

  const data = parseRecipeForm(formData, ctx.dict)
  if ('error' in data) return { error: data.error }

  // One recipe per item, enforced here (no DB unique index — see docs/database.md).
  if (await hasRecipe(item.id, ctx.restaurantId)) {
    return { error: ctx.dict.errors.recipes.alreadyExists }
  }

  await createRecipe({
    prepItemId: item.id,
    restaurantId: ctx.restaurantId,
    ingredients: data.ingredients,
    instructions: data.instructions,
    // Authored in the creator's language — drives translation direction.
    sourceLanguage: ctx.profile.preferredLanguage,
    createdBy: ctx.profile.id,
  })
  revalidatePath('/items')
  revalidatePath(`/items/${item.id}/recipe`)
  // Prep-list entries show a "View recipe" badge keyed on recipe existence.
  revalidatePath('/prep-lists', 'layout')
  return { success: true }
}

export async function updateRecipeAction(
  _prev: RecipeActionState,
  formData: FormData
): Promise<RecipeActionState> {
  const ctx = await requireBuilder()
  if ('error' in ctx) return { error: ctx.error }

  const recipeId = z.string().uuid().safeParse(formData.get('recipeId'))
  const itemId = z.string().uuid().safeParse(formData.get('itemId'))
  if (!recipeId.success || !itemId.success) return { error: ctx.dict.errors.recipes.notFound }

  // Confirm the item is ours (same discipline as create) before trusting itemId.
  const item = await getPrepItemById(itemId.data, ctx.restaurantId)
  if (!item) return { error: ctx.dict.errors.recipes.itemNotFound }

  const data = parseRecipeForm(formData, ctx.dict)
  if ('error' in data) return { error: data.error }

  // Scoped by restaurantId, so a foreign recipe id is a no-op. sourceLanguage is
  // re-stamped to the editor; source_hash staleness handles cache invalidation.
  await updateRecipe(recipeId.data, ctx.restaurantId, {
    ingredients: data.ingredients,
    instructions: data.instructions,
    sourceLanguage: ctx.profile.preferredLanguage,
  })
  revalidatePath('/items')
  revalidatePath(`/items/${itemId.data}/recipe`)
  return { success: true }
}

export async function deleteRecipeAction(
  recipeId: string,
  itemId: string
): Promise<{ error?: string }> {
  const ctx = await requireBuilder()
  if ('error' in ctx) return { error: ctx.error }

  const id = z.string().uuid().safeParse(recipeId)
  const item = z.string().uuid().safeParse(itemId)
  if (!id.success || !item.success) return { error: ctx.dict.errors.recipes.notFound }

  await deleteRecipe(id.data, ctx.restaurantId)
  revalidatePath('/items')
  revalidatePath(`/items/${item.data}/recipe`)
  // Prep-list entries show a "View recipe" badge keyed on recipe existence.
  revalidatePath('/prep-lists', 'layout')
  return {}
}

// Structures pasted text into ingredients/steps to prefill the editor. Writes
// nothing to the DB — the chef reviews and saves via createRecipeAction.
export async function parseRecipeAction(
  pastedText: string
): Promise<{ error?: string; data?: ParsedRecipe }> {
  const ctx = await requireBuilder()
  if ('error' in ctx) return { error: ctx.error }

  const text = z.string().trim().min(1).max(10000).safeParse(pastedText)
  if (!text.success) {
    const tooLong = (pastedText ?? '').trim().length > 10000
    return {
      error: tooLong ? ctx.dict.errors.recipes.pasteTooLong : ctx.dict.errors.recipes.pasteRequired,
    }
  }

  try {
    const data = await parseRecipe(text.data, ctx.profile.preferredLanguage)
    return { data }
  } catch {
    return { error: ctx.dict.errors.recipes.parseFailed }
  }
}
