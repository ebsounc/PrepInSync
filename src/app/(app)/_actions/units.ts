'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getProfileByUserId } from '@/lib/db/queries/profiles'
import { createRestaurantUnit } from '@/lib/db/queries/restaurant-units'
import { UNIT_VALUES } from '@/lib/units'

const labelSchema = z
  .string()
  .trim()
  .min(1, 'Enter a unit')
  .max(20, 'Keep it short')

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
  if (!user) return { error: 'You must be signed in.' }

  const profile = await getProfileByUserId(user.id)
  if (!profile?.restaurantId || !profile.isActive || !profile.canCreateLists) {
    return { error: 'You do not have permission to add units.' }
  }

  const parsed = labelSchema.safeParse(label)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  // Don't shadow a built-in unit (case-insensitive).
  if ((UNIT_VALUES as readonly string[]).some((u) => u.toLowerCase() === parsed.data.toLowerCase())) {
    return { error: 'That unit already exists.' }
  }

  await createRestaurantUnit({
    restaurantId: profile.restaurantId,
    label: parsed.data,
    createdBy: profile.id,
  })
  return {}
}
