'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getProfileByUserId } from '@/lib/db/queries/profiles'
import { updateRestaurant } from '@/lib/db/queries/restaurants'
import { deleteRestaurantUnit } from '@/lib/db/queries/restaurant-units'
import { isManagementRole } from '@/lib/auth/roles'

export type SettingsState = { error?: string; success?: boolean } | null

const VALID_TIMEZONES = new Set(Intl.supportedValuesOf('timeZone'))

const restaurantSchema = z.object({
  name: z.string().trim().min(1, 'Restaurant name is required').max(100),
  timezone: z.string().refine((v) => VALID_TIMEZONES.has(v), 'Select a valid timezone'),
})

// Management-only guard returning the caller's restaurant context.
async function requireManager() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in.' as const }

  const profile = await getProfileByUserId(user.id)
  if (!profile?.restaurantId || !profile.isActive || !isManagementRole(profile.role)) {
    return { error: 'You do not have permission to manage settings.' as const }
  }
  return { profile, restaurantId: profile.restaurantId }
}

export async function updateRestaurantAction(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const ctx = await requireManager()
  if ('error' in ctx) return { error: ctx.error }

  const parsed = restaurantSchema.safeParse({
    name: formData.get('name'),
    timezone: formData.get('timezone'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  await updateRestaurant(ctx.restaurantId, {
    name: parsed.data.name,
    timezone: parsed.data.timezone,
  })
  revalidatePath('/settings')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteRestaurantUnitAction(id: string): Promise<{ error?: string }> {
  const ctx = await requireManager()
  if ('error' in ctx) return { error: ctx.error }

  const parsedId = z.string().uuid().safeParse(id)
  if (!parsedId.success) return { error: 'Invalid unit.' }

  // deleteRestaurantUnit scopes by restaurantId, so a foreign id is a no-op.
  await deleteRestaurantUnit(parsedId.data, ctx.restaurantId)
  revalidatePath('/settings')
  return {}
}
