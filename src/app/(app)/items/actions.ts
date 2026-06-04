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
import { UNIT_VALUES } from '@/lib/units'

export type ItemActionState = { error?: string; success?: boolean } | null

// par quantity: optional positive decimal; empty string means "no par".
const itemSchema = z.object({
  name: z.string().trim().min(1, 'Item name is required').max(100),
  parQuantity: z
    .string()
    .trim()
    .regex(/^\d*\.?\d+$/, 'Par quantity must be a number')
    .optional()
    .or(z.literal('')),
  parUnit: z.enum(UNIT_VALUES).optional().or(z.literal('')),
})

// Item management is gated on can_create_lists (the people who build lists own the
// catalog). Returns the caller's restaurant context or an error.
async function requireBuilder() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in.' as const }

  const profile = await getProfileByUserId(user.id)
  if (!profile || !profile.restaurantId || !profile.isActive) {
    return { error: 'You do not have access.' as const }
  }
  if (!profile.canCreateLists) {
    return { error: 'You do not have permission to manage items.' as const }
  }
  return { profile, restaurantId: profile.restaurantId }
}

function parseItem(formData: FormData) {
  const parsed = itemSchema.safeParse({
    name: formData.get('name'),
    parQuantity: formData.get('parQuantity') ?? '',
    parUnit: formData.get('parUnit') ?? '',
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const { name, parQuantity, parUnit } = parsed.data
  // A par needs both a number and a unit to be meaningful; require them together.
  if ((parQuantity && !parUnit) || (!parQuantity && parUnit)) {
    return { error: 'Set both a par quantity and a unit, or leave both blank.' }
  }
  return {
    name,
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

  const data = parseItem(formData)
  if ('error' in data) return { error: data.error }

  await createPrepItem({
    restaurantId: ctx.restaurantId,
    name: data.name,
    parQuantity: data.parQuantity,
    parUnit: data.parUnit,
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
  if (!id.success) return { error: 'Invalid item.' }

  const data = parseItem(formData)
  if ('error' in data) return { error: data.error }

  await updatePrepItem(id.data, ctx.restaurantId, {
    name: data.name,
    parQuantity: data.parQuantity,
    parUnit: data.parUnit,
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
  if (!item) return { error: 'Item not found.' }

  if (await isPrepItemInUse(item.id)) {
    return { error: 'This item is used on a prep list and can’t be deleted.' }
  }
  await deletePrepItem(item.id, ctx.restaurantId)
  revalidatePath('/items')
  return {}
}
