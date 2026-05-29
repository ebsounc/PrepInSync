import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProfileByUserId } from '@/lib/db/queries/profiles'
import { getRestaurantById } from '@/lib/db/queries/restaurants'
import AuthFormWrapper from '@/components/auth/auth-form-wrapper'
import { PasswordForm } from '@/components/auth/password-form'

export default async function SetPasswordPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?error=session_expired')
  }

  const profile = await getProfileByUserId(user.id)
  const restaurant = profile?.restaurantId
    ? await getRestaurantById(profile.restaurantId)
    : null

  const welcomeTitle = restaurant
    ? `Welcome to ${restaurant.name}`
    : 'Set your password'

  return (
    <AuthFormWrapper title={welcomeTitle} description="Create a password to access your account">
      <PasswordForm submitLabel="Set password and sign in" />
    </AuthFormWrapper>
  )
}
