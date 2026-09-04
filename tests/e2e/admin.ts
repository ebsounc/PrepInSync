// Service-role helpers for E2E setup/teardown. Used only by the local E2E run --
// nothing here is imported by application code.
//
// Setup has to go through the admin API rather than the signup form because signup
// requires email confirmation (src/app/auth/confirm/route.ts), which a browser test
// can't complete without an inbox.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { loadE2eEnv, E2E_EMAIL, E2E_PASSWORD, E2E_FIRST_NAME, E2E_LAST_NAME } from './env'

export function adminClient(): SupabaseClient {
  const { supabaseUrl, serviceRoleKey } = loadE2eEnv()
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/** Finds the fixed E2E user, scanning a few pages of the user list. */
async function findE2eUser(admin: SupabaseClient): Promise<{ id: string } | null> {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw new Error(`listUsers failed: ${error.message}`)
    const match = data.users.find((u) => u.email === E2E_EMAIL)
    if (match) return { id: match.id }
    if (data.users.length < 200) return null
  }
  return null
}

/**
 * Deletes every row belonging to the E2E user's restaurant, then the profile, the
 * restaurant, and the auth user. Ordered child-first: the schema does not cascade
 * (see the FK block in supabase/setup.sql), so a wrong order fails on a constraint.
 */
export async function purgeE2eUser(): Promise<void> {
  const admin = adminClient()
  const user = await findE2eUser(admin)
  if (!user) return

  const { data: profile } = await admin
    .from('profiles')
    .select('id, restaurant_id')
    .eq('id', user.id)
    .maybeSingle()

  const restaurantId = profile?.restaurant_id as string | null | undefined

  if (restaurantId) {
    // prep_list_entries has no restaurant_id -- it is scoped through its list.
    const { data: lists } = await admin
      .from('prep_lists')
      .select('id')
      .eq('restaurant_id', restaurantId)
    const listIds = (lists ?? []).map((l) => l.id as string)
    if (listIds.length > 0) {
      await admin.from('prep_list_entries').delete().in('prep_list_id', listIds)
    }

    for (const table of [
      'prep_lists',
      'recipes',
      'prep_items',
      'restaurant_units',
      'glossary_overrides',
      'translations',
      'invites',
    ]) {
      await admin.from(table).delete().eq('restaurant_id', restaurantId)
    }
  }

  await admin.from('profiles').delete().eq('id', user.id)
  if (restaurantId) await admin.from('restaurants').delete().eq('id', restaurantId)

  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) throw new Error(`deleteUser failed: ${error.message}`)
}

/**
 * Creates a fresh, email-confirmed, un-onboarded E2E user. The handle_new_user trigger
 * turns the metadata below into a profile with restaurant_id NULL, so the app sends the
 * browser to /onboarding on first sign-in -- which is the flow under test.
 */
export async function createE2eUser(): Promise<void> {
  const admin = adminClient()
  const { error } = await admin.auth.admin.createUser({
    email: E2E_EMAIL,
    password: E2E_PASSWORD,
    email_confirm: true,
    user_metadata: {
      first_name: E2E_FIRST_NAME,
      last_name: E2E_LAST_NAME,
      preferred_language: 'en',
    },
  })
  if (error) throw new Error(`createUser failed: ${error.message}`)
}
