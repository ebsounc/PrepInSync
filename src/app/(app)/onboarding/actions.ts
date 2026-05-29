'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getProfileByUserId } from '@/lib/db/queries/profiles'
import { createRestaurantAndOnboardProfile } from '@/lib/db/queries/restaurants'

const VALID_TIMEZONES = new Set(Intl.supportedValuesOf('timeZone'))

const onboardingSchema = z.object({
  restaurantName: z.string().min(1, 'Restaurant name is required').max(100),
  timezone: z.string().refine((v) => VALID_TIMEZONES.has(v), 'Select a valid timezone'),
})

type OnboardingState = { error?: string } | null

export async function completeOnboardingAction(
  prevState: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const parsed = onboardingSchema.safeParse({
    restaurantName: formData.get('restaurantName'),
    timezone: formData.get('timezone'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const profile = await getProfileByUserId(user.id)

  // Idempotency guard — already onboarded
  if (profile?.restaurantId) {
    redirect('/dashboard')
  }

  try {
    await createRestaurantAndOnboardProfile(user.id, {
      name: parsed.data.restaurantName,
      timezone: parsed.data.timezone,
    })
  } catch {
    return { error: 'Failed to create your restaurant. Please try again.' }
  }

  redirect('/dashboard')
}
