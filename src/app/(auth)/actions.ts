'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getProfileByUserId } from '@/lib/db/queries/profiles'
import { getOrigin } from '@/lib/get-origin'
import { asLang, resolveKey } from '@/lib/i18n'
import { setCookieLang, getActionDict } from '@/lib/i18n/server'
import { setAppearanceCookies, clearAppearanceCookies } from '@/lib/appearance-cookies'
import { isDemoRestaurant } from '@/lib/demo'
import { DEMO_EMAIL, resetDemoData } from '@/lib/demo-seed'
import { consumeRateLimit } from '@/lib/db/queries/rate-limit'
import { demoLoginRule, demoResetRule } from '@/lib/rate-limits'

// Zod messages carry a dotted dictionary KEY; resolved to the user's language on
// return (auth pages have no profile, so the dict comes from the lang cookie).

// ---------------------------------------------------------------------------
// Auth-page language
// ---------------------------------------------------------------------------

// The signup form's language picker takes effect immediately instead of only applying
// to the account once it exists. Writing the cookie + revalidating re-renders the whole
// page in the chosen language — including `<html lang>` and the server-rendered card
// header, neither of which a client-only switch could reach. Mirrors the Settings
// language setter (settings/actions.ts).
export async function setAuthLanguageAction(language: string) {
  await setCookieLang(asLang(language))
  revalidatePath('/', 'layout')
}

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

  if (!profile?.restaurantId) {
    redirect('/onboarding')
  }

  redirect('/dashboard')
}

// ---------------------------------------------------------------------------
// Demo
// ---------------------------------------------------------------------------

// The login page's "Try the demo" button. Signs into the shared Demo Kitchen account
// server-side with a one-time admin-generated link instead of a password, so there is
// no published credential to script against, and a visitor who changes the demo
// password (the Supabase auth API is reachable from the browser) can't lock everyone
// else out. generateLink only returns the token — it sends no email.
export async function demoLoginAction(_prevState: LoginState): Promise<LoginState> {
  const dict = await getActionDict()

  // Per IP: every click reseeds the kitchen, so a looping script would hammer the DB
  // and keep wiping the translation cache. x-forwarded-for is set by Vercel's edge, not
  // the client; locally it's absent and everyone shares one bucket, which is harmless.
  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const { allowed } = await consumeRateLimit(demoLoginRule(ip))
  if (!allowed) return { error: dict.errors.auth.demoRateLimited }

  // Reseed first so the visitor lands in a clean kitchen and never inherits the last
  // one's edits. Best-effort — a failed or globally rate-limited reset shouldn't block
  // the demo itself.
  if ((await consumeRateLimit(demoResetRule())).allowed) {
    try {
      await resetDemoData()
    } catch (e) {
      console.error('demo reset failed', e)
    }
  }

  const { data, error } = await createAdminClient().auth.admin.generateLink({
    type: 'magiclink',
    email: DEMO_EMAIL,
  })
  if (error || !data.properties?.hashed_token) {
    console.error('demo link generation failed', error)
    return { error: dict.errors.auth.demoUnavailable }
  }
  const supabase = await createClient()
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: 'magiclink',
    token_hash: data.properties.hashed_token,
  })
  if (verifyError) {
    console.error('demo sign-in failed', verifyError)
    return { error: dict.errors.auth.demoUnavailable }
  }

  // Matches what resetDemoData just wrote to the GM profile, so the first paint is
  // English + default theme regardless of what this device had before.
  await setCookieLang('en')
  await setAppearanceCookies('system', null)
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
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const profile = user ? await getProfileByUserId(user.id) : null

  // The demo account is shared; its password isn't the visitor's to change. (The demo
  // button doesn't use the password, so this is hygiene, not what keeps the demo up.)
  if (isDemoRestaurant(profile?.restaurantId)) {
    return { error: (await getActionDict()).errors.auth.demoPasswordLocked }
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })

  if (error) {
    return { error: (await getActionDict()).errors.auth.resetFailed }
  }

  // This path (password reset + invite set-password) creates a session without going
  // through loginAction, so seed the appearance cookies from the profile — otherwise a
  // stale cookie from a prior user on this device would win in the root layout.
  if (profile) await setAppearanceCookies(profile.theme, profile.accentColor)

  redirect('/dashboard')
}
