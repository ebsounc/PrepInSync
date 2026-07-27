'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getProfileByUserId } from '@/lib/db/queries/profiles'
import { createRestaurantUnit } from '@/lib/db/queries/restaurant-units'
import { UNIT_VALUES } from '@/lib/units'
import { getDictionary, resolveKey } from '@/lib/i18n'
import { getActionDict } from '@/lib/i18n/server'

const labelSchema = z
  .string()
  .trim()
  .min(1, 'errors.settings.enterUnit')
  .max(20, 'errors.settings.unitTooLong')

// Builders (people who manage items/lists) can add a custom unit for the restaurant.
// Gated on canCreateLists, not management: adding a unit is part of catalog/list
// building and the inline "+ Add unit" lives in the builder forms. Removing units is
// management-only (see settings/actions.ts) since it's destructive config.
// Shared by the item and prep-list forms via UnitSelect's onAddUnit.
export async function addCustomUnitAction(label: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: (await getActionDict()).errors.common.signInRequired }

  const profile = await getProfileByUserId(user.id)
  if (!profile?.restaurantId || !profile.isActive || !profile.canCreateLists) {
    return { error: (await getActionDict(profile?.preferredLanguage)).errors.settings.noPermissionUnits }
  }

  const dict = getDictionary(profile.preferredLanguage)
  const parsed = labelSchema.safeParse(label)
  if (!parsed.success) return { error: resolveKey(dict, parsed.error.issues[0].message) }

  // Don't shadow a built-in unit (case-insensitive).
  if ((UNIT_VALUES as readonly string[]).some((u) => u.toLowerCase() === parsed.data.toLowerCase())) {
    return { error: dict.errors.settings.unitExists }
  }

  await createRestaurantUnit({
    restaurantId: profile.restaurantId,
    label: parsed.data,
    sourceLanguage: profile.preferredLanguage,
    createdBy: profile.id,
  })
  // Surface the new unit (and its pending translation) in the builder forms, and in
  // the Settings units list, which can now add them too.
  revalidatePath('/items')
  revalidatePath('/prep-lists', 'layout')
  revalidatePath('/settings')
  return {}
}
