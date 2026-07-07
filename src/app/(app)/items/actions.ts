'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getProfileByUserId } from '@/lib/db/queries/profiles'
import {
  createPrepItem,
  updatePrepItem,
  deletePrepItem,
  isPrepItemInUse,
  getPrepItemById,
  setPrepItemImageUrl,
} from '@/lib/db/queries/prep-items'
import { createRecipe, getRecipeByItemId } from '@/lib/db/queries/recipes'
import { isValidUnit } from '@/lib/db/queries/restaurant-units'
import { uploadImage, deleteImage, deletePrefix, itemThumbPath } from '@/lib/storage'
import { decodeImageInput } from '@/lib/images/validate'
import { parseRecipeJson, recipeJsonHasContent, type ParsedRecipePayload } from '@/lib/recipes/payload'
import { getDictionary, resolveKey, type Dict } from '@/lib/i18n'
import { getActionDict } from '@/lib/i18n/server'

export type ItemActionState = { error?: string; success?: boolean } | null

// Amounts are optional positive decimals; empty string means "not set". Unit is free
// text here; membership (built-in or custom) is checked in the action where the
// restaurant id is known. Zod messages carry dictionary KEYS resolved on return.
const optionalAmount = z
  .string()
  .trim()
  .regex(/^\d*\.?\d+$/, 'errors.items.amountNumber')
  .optional()
  .or(z.literal(''))
const optionalUnit = z.string().trim().max(20).optional().or(z.literal(''))

const itemSchema = z.object({
  name: z.string().trim().min(1, 'errors.items.nameRequired').max(100),
  description: z.string().trim().max(500).optional().or(z.literal('')),
  defaultQuantity: optionalAmount,
  defaultUnit: optionalUnit,
  parQuantity: optionalAmount,
  parUnit: optionalUnit,
})

// Item management is gated on can_create_lists (the people who build lists own the
// catalog). Returns the caller's restaurant context (+ localized dict) or an error.
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
    return { error: getDictionary(profile.preferredLanguage).errors.items.noPermission }
  }
  return {
    profile,
    restaurantId: profile.restaurantId,
    dict: getDictionary(profile.preferredLanguage),
  }
}

// Parses + validates the item form. restaurantId is needed to validate a custom unit.
async function parseItem(formData: FormData, restaurantId: string, dict: Dict) {
  const parsed = itemSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description') ?? '',
    defaultQuantity: formData.get('defaultQuantity') ?? '',
    defaultUnit: formData.get('defaultUnit') ?? '',
    parQuantity: formData.get('parQuantity') ?? '',
    parUnit: formData.get('parUnit') ?? '',
  })
  if (!parsed.success) return { error: resolveKey(dict, parsed.error.issues[0].message) }
  const { name, description, defaultQuantity, defaultUnit, parQuantity, parUnit } = parsed.data

  // Each amount needs both a number and a unit to be meaningful; require them together.
  if ((defaultQuantity && !defaultUnit) || (!defaultQuantity && defaultUnit)) {
    return { error: dict.errors.items.defaultAmountPair }
  }
  if ((parQuantity && !parUnit) || (!parQuantity && parUnit)) {
    return { error: dict.errors.items.parAmountPair }
  }
  for (const u of [defaultUnit, parUnit]) {
    if (u && !(await isValidUnit(restaurantId, u))) return { error: dict.errors.items.invalidUnit }
  }
  return {
    name,
    description: description ? description : null,
    defaultQuantity: defaultQuantity ? defaultQuantity : null,
    defaultUnit: defaultUnit ? defaultUnit : null,
    parQuantity: parQuantity ? parQuantity : null,
    parUnit: parUnit ? parUnit : null,
  }
}

export async function createItemAction(
  _prev: ItemActionState,
  formData: FormData
): Promise<ItemActionState> {
  const ctx = await requireBuilder()
  if ('error' in ctx) return { error: ctx.error }

  const data = await parseItem(formData, ctx.restaurantId, ctx.dict)
  if ('error' in data) return { error: data.error }

  // Optional inline recipe ("+ Add recipe" in the create form). An opened-but-empty
  // section is skipped; a started one must be complete. Validate BEFORE creating the
  // item so an invalid recipe never leaves an orphan item.
  const recipeRaw = String(formData.get('recipe') ?? '')
  let recipe: ParsedRecipePayload | null = null
  if (recipeRaw && recipeJsonHasContent(recipeRaw)) {
    const parsed = parseRecipeJson(recipeRaw, ctx.dict)
    if ('error' in parsed) return { error: parsed.error }
    recipe = parsed
  }

  const item = await createPrepItem({
    restaurantId: ctx.restaurantId,
    name: data.name,
    description: data.description,
    defaultQuantity: data.defaultQuantity,
    defaultUnit: data.defaultUnit,
    parQuantity: data.parQuantity,
    parUnit: data.parUnit,
    // Authored in the creator's language — drives translation direction.
    sourceLanguage: ctx.profile.preferredLanguage,
    createdBy: ctx.profile.id,
  })

  if (recipe) {
    await createRecipe({
      prepItemId: item.id,
      restaurantId: ctx.restaurantId,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      sourceLanguage: ctx.profile.preferredLanguage,
      createdBy: ctx.profile.id,
    })
    // Prep-list entries show a "View recipe" badge keyed on recipe existence.
    revalidatePath('/prep-lists', 'layout')
  }
  revalidatePath('/items')
  return { success: true }
}

export async function updateItemAction(
  _prev: ItemActionState,
  formData: FormData
): Promise<ItemActionState> {
  const ctx = await requireBuilder()
  if ('error' in ctx) return { error: ctx.error }

  const id = z.string().uuid().safeParse(formData.get('id'))
  if (!id.success) return { error: ctx.dict.errors.items.invalidItem }

  const data = await parseItem(formData, ctx.restaurantId, ctx.dict)
  if ('error' in data) return { error: data.error }

  await updatePrepItem(id.data, ctx.restaurantId, {
    name: data.name,
    description: data.description,
    defaultQuantity: data.defaultQuantity,
    defaultUnit: data.defaultUnit,
    parQuantity: data.parQuantity,
    parUnit: data.parUnit,
    sourceLanguage: ctx.profile.preferredLanguage,
  })
  revalidatePath('/items')
  return { success: true }
}

export async function deleteItemAction(id: string): Promise<{ error?: string }> {
  const ctx = await requireBuilder()
  if ('error' in ctx) return { error: ctx.error }

  // Confirm the item is ours before the in-use check, so a foreign id can't probe
  // whether some other restaurant's item is referenced anywhere.
  const item = await getPrepItemById(id, ctx.restaurantId)
  if (!item) return { error: ctx.dict.errors.items.notFound }

  if (await isPrepItemInUse(item.id)) {
    return { error: ctx.dict.errors.items.inUse }
  }
  // The item's recipe (if any) cascades away in the DB, but its Storage cover photo
  // does not — grab the recipe id before the delete so we can clean it up too.
  const recipe = await getRecipeByItemId(item.id, ctx.restaurantId)
  await deletePrepItem(item.id, ctx.restaurantId)
  // Best-effort Storage cleanup (thumbnail + any recipe cover), in parallel. Never
  // blocks delete.
  try {
    await Promise.all([
      deletePrefix(`${ctx.restaurantId}/items/${item.id}/`),
      recipe ? deletePrefix(`${ctx.restaurantId}/recipes/${recipe.id}/`) : Promise.resolve(),
    ])
  } catch {}
  revalidatePath('/items')
  return {}
}

// Uploads (or replaces) a prep item's thumbnail. Stores the OBJECT PATH (not a
// signed URL) on prep_items.image_url.
export async function setItemImageAction(
  itemId: string,
  input: { imageBase64: string; mediaType: string }
): Promise<{ error?: string }> {
  const ctx = await requireBuilder()
  if ('error' in ctx) return { error: ctx.error }

  const id = z.string().uuid().safeParse(itemId)
  if (!id.success) return { error: ctx.dict.errors.items.notFound }
  const item = await getPrepItemById(id.data, ctx.restaurantId)
  if (!item) return { error: ctx.dict.errors.items.notFound }

  const decoded = decodeImageInput(input)
  if ('code' in decoded) {
    return {
      error:
        decoded.code === 'tooLarge'
          ? ctx.dict.errors.items.imageTooLarge
          : ctx.dict.errors.items.imageInvalid,
    }
  }

  const path = itemThumbPath(ctx.restaurantId, id.data)
  try {
    await uploadImage(path, decoded.bytes, 'image/jpeg')
  } catch {
    return { error: ctx.dict.errors.items.imageUploadFailed }
  }
  await setPrepItemImageUrl(id.data, ctx.restaurantId, path)
  revalidatePath('/items')
  return {}
}

export async function removeItemImageAction(itemId: string): Promise<{ error?: string }> {
  const ctx = await requireBuilder()
  if ('error' in ctx) return { error: ctx.error }

  const id = z.string().uuid().safeParse(itemId)
  if (!id.success) return { error: ctx.dict.errors.items.notFound }
  const item = await getPrepItemById(id.data, ctx.restaurantId)
  if (!item) return { error: ctx.dict.errors.items.notFound }

  await setPrepItemImageUrl(id.data, ctx.restaurantId, null)
  try {
    await deleteImage(itemThumbPath(ctx.restaurantId, id.data))
  } catch {}
  revalidatePath('/items')
  return {}
}
