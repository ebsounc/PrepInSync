import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProfileByUserId } from '@/lib/db/queries/profiles'
import { getRestaurantById } from '@/lib/db/queries/restaurants'
import AuthFormWrapper from '@/components/auth/auth-form-wrapper'
import { PasswordForm } from '@/components/auth/password-form'
import { getDictionary, interpolate } from '@/lib/i18n'
import { getCookieLang } from '@/lib/i18n/server'

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

  // Use the cookie language so the server-rendered title matches the form fields,
  // which read the same cookie via the (auth) layout's LanguageProvider.
  const dict = getDictionary(await getCookieLang())
  const welcomeTitle = restaurant
    ? interpolate(dict.auth.setPasswordWelcome, { restaurant: restaurant.name })
    : dict.auth.setPasswordTitleFallback

  return (
    <AuthFormWrapper title={welcomeTitle} description={dict.auth.setPasswordDesc}>
      <PasswordForm submitLabel={dict.auth.setPasswordSignIn} />
    </AuthFormWrapper>
  )
}
