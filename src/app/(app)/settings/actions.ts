'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { setCookieLang, getActionDict } from '@/lib/i18n/server'
import { getDictionary, resolveKey } from '@/lib/i18n'
import {
  getProfileByUserId,
  transferOwnership,
  setPreferredLanguage,
} from '@/lib/db/queries/profiles'
import { updateRestaurant } from '@/lib/db/queries/restaurants'
import { deleteRestaurantUnit } from '@/lib/db/queries/restaurant-units'
import { isManagementRole } from '@/lib/auth/roles'

export type SettingsState = { error?: string; success?: boolean } | null

const VALID_TIMEZONES = new Set(Intl.supportedValuesOf('timeZone'))

const restaurantSchema = z.object({
  name: z.string().trim().min(1, 'errors.settings.restaurantNameRequired').max(100),
  timezone: z.string().refine((v) => VALID_TIMEZONES.has(v), 'errors.settings.invalidTimezone'),
  listDefaultDay: z.enum(['today', 'next_day']),
})

// Management-only guard returning the caller's restaurant context (+ localized dict).
async function requireManager() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: (await getActionDict()).errors.common.signInRequired }

  const profile = await getProfileByUserId(user.id)
  if (!profile?.restaurantId || !profile.isActive || !isManagementRole(profile.role)) {
    return { error: (await getActionDict(profile?.preferredLanguage)).errors.settings.noPermission }
  }
  return {
    profile,
    restaurantId: profile.restaurantId,
    dict: getDictionary(profile.preferredLanguage),
  }
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
    listDefaultDay: formData.get('listDefaultDay'),
  })
  if (!parsed.success) return { error: resolveKey(ctx.dict, parsed.error.issues[0].message) }

  await updateRestaurant(ctx.restaurantId, {
    name: parsed.data.name,
    timezone: parsed.data.timezone,
    listDefaultDay: parsed.data.listDefaultDay,
  })
  revalidatePath('/settings')
  revalidatePath('/dashboard')
  return { success: true }
}

// Language is a per-user preference, available to every active member (cooks
// included) — NOT gated on management. Revalidates the whole app shell so all
// server-rendered content re-renders in the new language.
export async function updateLanguageAction(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: (await getActionDict()).errors.common.signInRequired }

  const profile = await getProfileByUserId(user.id)
  if (!profile?.restaurantId || !profile.isActive) {
    return { error: (await getActionDict(profile?.preferredLanguage)).errors.common.noAccess }
  }

  const parsed = z.enum(['en', 'es']).safeParse(formData.get('language'))
  if (!parsed.success) {
    return { error: getDictionary(profile.preferredLanguage).errors.settings.invalidLanguage }
  }

  await setPreferredLanguage(user.id, parsed.data)
  // Keep the cookie in sync so logged-out pages + <html lang> reflect the choice.
  await setCookieLang(parsed.data)
  revalidatePath('/', 'layout')
  return { success: true }
}

// Owner-only guard — ownership transfer is the one action restricted to the owner.
async function requireOwner() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: (await getActionDict()).errors.common.signInRequired }

  const profile = await getProfileByUserId(user.id)
  if (!profile?.restaurantId || !profile.isActive || profile.role !== 'owner') {
    return { error: (await getActionDict(profile?.preferredLanguage)).errors.settings.ownerOnlyTransfer }
  }
  return {
    profile,
    restaurantId: profile.restaurantId,
    dict: getDictionary(profile.preferredLanguage),
  }
}

export async function transferOwnershipAction(targetId: string): Promise<{ error?: string }> {
  const ctx = await requireOwner()
  if ('error' in ctx) return { error: ctx.error }

  const parsedId = z.string().uuid().safeParse(targetId)
  if (!parsedId.success) return { error: ctx.dict.errors.settings.invalidMember }
  if (parsedId.data === ctx.profile.id) return { error: ctx.dict.errors.settings.alreadyOwner }

  const target = await getProfileByUserId(parsedId.data)
  if (!target || target.restaurantId !== ctx.restaurantId) {
    return { error: ctx.dict.errors.settings.memberNotFound }
  }
  if (!target.isActive) return { error: ctx.dict.errors.settings.memberDeactivated }
  if (target.role === 'owner') return { error: ctx.dict.errors.settings.memberAlreadyOwner }

  await transferOwnership(ctx.restaurantId, ctx.profile.id, target.id)
  revalidatePath('/settings')
  revalidatePath('/team')
  revalidatePath('/dashboard')
  return {}
}

export async function deleteRestaurantUnitAction(id: string): Promise<{ error?: string }> {
  const ctx = await requireManager()
  if ('error' in ctx) return { error: ctx.error }

  const parsedId = z.string().uuid().safeParse(id)
  if (!parsedId.success) return { error: ctx.dict.errors.settings.invalidUnit }

  // deleteRestaurantUnit scopes by restaurantId, so a foreign id is a no-op.
  await deleteRestaurantUnit(parsedId.data, ctx.restaurantId)
  revalidatePath('/settings')
  return {}
}
