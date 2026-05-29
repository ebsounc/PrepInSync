'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getProfileByUserId } from '@/lib/db/queries/profiles'
import { getOrigin } from '@/lib/get-origin'

// ---------------------------------------------------------------------------
// Signup
// ---------------------------------------------------------------------------

const signupSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
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
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { firstName, lastName, email, password } = parsed.data
  const origin = await getOrigin()
  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { first_name: firstName, last_name: lastName, preferred_language: 'en' },
      emailRedirectTo: `${origin}/auth/confirm`,
    },
  })

  if (error) {
    // Don't forward Supabase's message — it can reveal whether an email is
    // already registered (user enumeration).
    return { error: 'Could not create your account. Please try again.' }
  }

  return { success: true }
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
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
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error || !data.user) {
    return { error: 'Invalid email or password.' }
  }

  const profile = await getProfileByUserId(data.user.id)

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
  redirect('/login')
}

// ---------------------------------------------------------------------------
// Forgot password
// ---------------------------------------------------------------------------

const forgotPasswordSchema = z.object({
  email: z.string().email('Enter a valid email address'),
})

type ForgotPasswordState = { error?: string; success?: boolean } | null

export async function forgotPasswordAction(
  prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get('email') })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
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
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type ResetPasswordState = { error?: string } | null

export async function resetPasswordAction(
  prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const parsed = resetPasswordSchema.safeParse({ password: formData.get('password') })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })

  if (error) {
    return { error: 'Could not update password. Your link may have expired.' }
  }

  redirect('/dashboard')
}
