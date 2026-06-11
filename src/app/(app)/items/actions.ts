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
} from '@/lib/db/queries/prep-items'
import { isValidUnit } from '@/lib/db/queries/restaurant-units'
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

  await createPrepItem({
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
  await deletePrepItem(item.id, ctx.restaurantId)
  revalidatePath('/items')
  return {}
}
