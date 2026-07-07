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
  getRecipeById,
  setRecipeImageUrl,
} from '@/lib/db/queries/recipes'
import { parseRecipe, scanRecipe, type ParsedRecipe } from '@/lib/ai'
import { parseRecipeJson, type ParsedRecipePayload } from '@/lib/recipes/payload'
import { uploadImage, deleteImage, deletePrefix, recipeCoverPath } from '@/lib/storage'
import { decodeImageInput } from '@/lib/images/validate'
import { getDictionary, type Dict } from '@/lib/i18n'
import { getActionDict } from '@/lib/i18n/server'

export type RecipeActionState = { error?: string; success?: boolean } | null

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
// map cleanly to flat FormData). Validation lives in the shared payload module so the
// inline "add recipe while creating an item" flow enforces the same rules.
function parseRecipeForm(
  formData: FormData,
  dict: Dict
): ParsedRecipePayload | { error: string } {
  return parseRecipeJson(String(formData.get('recipe') ?? ''), dict)
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

  // Confirm ownership before touching Storage (same discipline as the image actions);
  // a foreign/unknown id is a DB no-op, so just skip cleanup.
  const existing = await getRecipeById(id.data, ctx.restaurantId)
  await deleteRecipe(id.data, ctx.restaurantId)
  // Best-effort: drop the recipe's Storage objects (cover photo). A failure here
  // must not block the DB delete — the row is already gone.
  try {
    if (existing) await deletePrefix(`${ctx.restaurantId}/recipes/${id.data}/`)
  } catch {}
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

// Structures a recipe PHOTO into ingredients/steps to prefill the editor (Claude
// vision). Writes nothing — the image is used inline and discarded; the chef reviews
// and saves via createRecipeAction. Mirrors parseRecipeAction.
export async function scanRecipeAction(input: {
  imageBase64: string
  mediaType: string
}): Promise<{ error?: string; data?: ParsedRecipe }> {
  const ctx = await requireBuilder()
  if ('error' in ctx) return { error: ctx.error }

  const decoded = decodeImageInput(input)
  if ('code' in decoded) {
    return {
      error:
        decoded.code === 'tooLarge'
          ? ctx.dict.errors.recipes.scanTooLarge
          : ctx.dict.errors.recipes.scanImageInvalid,
    }
  }

  try {
    const data = await scanRecipe(decoded.base64, decoded.mediaType, ctx.profile.preferredLanguage)
    return { data }
  } catch {
    return { error: ctx.dict.errors.recipes.scanFailed }
  }
}

// Uploads (or replaces) a recipe's cover photo. Stored at the recipe's tenant-scoped
// path; the OBJECT PATH (not a signed URL) is saved on recipes.image_url.
export async function setRecipeImageAction(
  recipeId: string,
  itemId: string,
  input: { imageBase64: string; mediaType: string }
): Promise<{ error?: string }> {
  const ctx = await requireBuilder()
  if ('error' in ctx) return { error: ctx.error }

  const id = z.string().uuid().safeParse(recipeId)
  const item = z.string().uuid().safeParse(itemId)
  if (!id.success || !item.success) return { error: ctx.dict.errors.recipes.notFound }

  // Confirm the recipe is ours before touching Storage or the row.
  const recipe = await getRecipeById(id.data, ctx.restaurantId)
  if (!recipe) return { error: ctx.dict.errors.recipes.notFound }

  const decoded = decodeImageInput(input)
  if ('code' in decoded) {
    return {
      error:
        decoded.code === 'tooLarge'
          ? ctx.dict.errors.recipes.imageTooLarge
          : ctx.dict.errors.recipes.imageInvalid,
    }
  }

  const path = recipeCoverPath(ctx.restaurantId, id.data)
  try {
    await uploadImage(path, decoded.bytes, 'image/jpeg')
  } catch {
    return { error: ctx.dict.errors.recipes.imageUploadFailed }
  }
  await setRecipeImageUrl(id.data, ctx.restaurantId, path)
  revalidatePath('/items')
  revalidatePath(`/items/${item.data}/recipe`)
  return {}
}

export async function removeRecipeImageAction(
  recipeId: string,
  itemId: string
): Promise<{ error?: string }> {
  const ctx = await requireBuilder()
  if ('error' in ctx) return { error: ctx.error }

  const id = z.string().uuid().safeParse(recipeId)
  const item = z.string().uuid().safeParse(itemId)
  if (!id.success || !item.success) return { error: ctx.dict.errors.recipes.notFound }

  const recipe = await getRecipeById(id.data, ctx.restaurantId)
  if (!recipe) return { error: ctx.dict.errors.recipes.notFound }

  await setRecipeImageUrl(id.data, ctx.restaurantId, null)
  try {
    await deleteImage(recipeCoverPath(ctx.restaurantId, id.data))
  } catch {}
  revalidatePath('/items')
  revalidatePath(`/items/${item.data}/recipe`)
  return {}
}
