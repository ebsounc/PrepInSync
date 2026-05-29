import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProfileByUserId } from '@/lib/db/queries/profiles'

// Pages that need an active session (recovery/invite) — skip the "already logged in" redirect
const SESSION_REQUIRED_PATHS = ['/reset-password', '/set-password']

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? ''

  if (SESSION_REQUIRED_PATHS.some((p) => pathname.startsWith(p))) {
    return <>{children}</>
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const profile = await getProfileByUserId(user.id)
    if (profile?.restaurantId) {
      redirect('/dashboard')
    }
    redirect('/onboarding')
  }

  return <>{children}</>
}
