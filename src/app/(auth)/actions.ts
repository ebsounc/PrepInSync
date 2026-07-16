'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getProfileByUserId } from '@/lib/db/queries/profiles'
import { getOrigin } from '@/lib/get-origin'
import { asLang, resolveKey } from '@/lib/i18n'
import { setCookieLang, getActionDict } from '@/lib/i18n/server'
import { setAppearanceCookies, clearAppearanceCookies } from '@/lib/appearance-cookies'
import { isDemoRestaurant } from '@/lib/demo'
import { resetDemoData } from '@/lib/demo-seed'

// Zod messages carry a dotted dictionary KEY; resolved to the user's language on
// return (auth pages have no profile, so the dict comes from the lang cookie).

// ---------------------------------------------------------------------------
// Signup
// ---------------------------------------------------------------------------

const signupSchema = z.object({
  firstName: z.string().min(1, 'errors.auth.firstNameRequired'),
  lastName: z.string().min(1, 'errors.auth.lastNameRequired'),
  email: z.string().email('errors.auth.invalidEmail'),
  password: z.string().min(8, 'errors.auth.passwordMin'),
  language: z.enum(['en', 'es']).default('en'),
})

type SignupState = { error?: string; success?: boolean } | null

export async function signupAction(
  prevState: SignupState,
  formData: FormData
): Promise<SignupState> {
  const parsed = signupSchema.safeParse({
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    email: formData.get('email'),
    password: formData.get('password'),
    language: formData.get('language') ?? 'en',
  })

  if (!parsed.success) {
    // Honor the language picked on the form (parsed.data is unavailable on failure).
    const dict = await getActionDict(asLang(formData.get('language') as string | null))
    return { error: resolveKey(dict, parsed.error.issues[0].message) }
  }

  const { firstName, lastName, email, password, language } = parsed.data
  const origin = await getOrigin()
  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // preferred_language flows to the handle_new_user trigger, which seeds the
      // profile row with it.
      data: { first_name: firstName, last_name: lastName, preferred_language: language },
      emailRedirectTo: `${origin}/auth/confirm`,
    },
  })

  if (error) {
    // Don't forward Supabase's message — it can reveal whether an email is
    // already registered (user enumeration).
    return { error: (await getActionDict(language)).errors.auth.signupFailed }
  }

  // Reflect their choice on the auth screens immediately (confirm/login).
  await setCookieLang(language)
  return { success: true }
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

const loginSchema = z.object({
  email: z.string().email('errors.auth.invalidEmail'),
  password: z.string().min(1, 'errors.auth.passwordRequired'),
})

type LoginState = { error?: string } | null

export async function loginAction(
  prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    const dict = await getActionDict()
    return { error: resolveKey(dict, parsed.error.issues[0].message) }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error || !data.user) {
    return { error: (await getActionDict()).errors.auth.invalidCredentials }
  }

  const profile = await getProfileByUserId(data.user.id)

  // Sync language + appearance cookies to their saved preferences so a new device
  // renders correctly on first paint (this is the cross-device mechanism).
  if (profile) {
    await setCookieLang(profile.preferredLanguage)
    await setAppearanceCookies(profile.theme, profile.accentColor)
  }

  // Public demo: reseed a clean kitchen on every login so each visitor starts fresh
  // and never inherits the last one's edits. Best-effort — never block sign-in.
  if (isDemoRestaurant(profile?.restaurantId)) {
    try {
      await resetDemoData()
    } catch (e) {
      console.error('demo reset failed', e)
    }
  }

  if (!profile?.restaurantId) {
    redirect('/onboarding')
  }

  redirect('/dashboard')
}

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  await clearAppearanceCookies()
  redirect('/login')
}

// ---------------------------------------------------------------------------
// Forgot password
// ---------------------------------------------------------------------------

const forgotPasswordSchema = z.object({
  email: z.string().email('errors.auth.invalidEmail'),
})

type ForgotPasswordState = { error?: string; success?: boolean } | null

export async function forgotPasswordAction(
  prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get('email') })

  if (!parsed.success) {
    const dict = await getActionDict()
    return { error: resolveKey(dict, parsed.error.issues[0].message) }
  }

  const origin = await getOrigin()
  const supabase = await createClient()

  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/confirm`,
  })

  // Always return success — never reveal whether the email exists
  return { success: true }
}

// ---------------------------------------------------------------------------
// Reset / set password
// ---------------------------------------------------------------------------

const resetPasswordSchema = z.object({
  password: z.string().min(8, 'errors.auth.passwordMin'),
})

type ResetPasswordState = { error?: string } | null

export async function resetPasswordAction(
  prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const parsed = resetPasswordSchema.safeParse({ password: formData.get('password') })

  if (!parsed.success) {
    const dict = await getActionDict()
    return { error: resolveKey(dict, parsed.error.issues[0].message) }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })

  if (error) {
    return { error: (await getActionDict()).errors.auth.resetFailed }
  }

  // This path (password reset + invite set-password) creates a session without going
  // through loginAction, so seed the appearance cookies from the profile — otherwise a
  // stale cookie from a prior user on this device would win in the root layout.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) {
    const profile = await getProfileByUserId(user.id)
    if (profile) await setAppearanceCookies(profile.theme, profile.accentColor)
  }

  redirect('/dashboard')
}
