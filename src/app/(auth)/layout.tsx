import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProfileByUserId } from '@/lib/db/queries/profiles'
import { getDictionary } from '@/lib/i18n'
import { getCookieLang } from '@/lib/i18n/server'
import { LanguageProvider } from '@/lib/i18n/client'

// Pages that need an active session (recovery/invite) — skip the "already logged in" redirect
const SESSION_REQUIRED_PATHS = ['/reset-password', '/set-password']

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? ''

  // Logged-out pages have no profile — language comes from the `lang` cookie (default en).
  const lang = await getCookieLang()
  const dict = getDictionary(lang)
  const wrap = (node: React.ReactNode) => (
    <LanguageProvider dict={dict} lang={lang}>
      {node}
    </LanguageProvider>
  )

  if (SESSION_REQUIRED_PATHS.some((p) => pathname.startsWith(p))) {
    return wrap(children)
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

  return wrap(children)
}
