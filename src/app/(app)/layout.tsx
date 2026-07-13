import Link from 'next/link'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { SettingsIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getProfileByUserId } from '@/lib/db/queries/profiles'
import { isManagementRole } from '@/lib/auth/roles'
import { logoutAction } from '@/app/(auth)/actions'
import { getDictionary } from '@/lib/i18n'
import { LanguageProvider } from '@/lib/i18n/client'
import { Button } from '@/components/ui/button'
import { BottomNav } from './_components/bottom-nav'
import { OfflineManager } from './_components/offline-manager'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const profile = await getProfileByUserId(user.id)

  // Redirect incomplete onboarding, but not if already on /onboarding
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? ''

  if (!profile?.restaurantId && !pathname.startsWith('/onboarding')) {
    redirect('/onboarding')
  }

  const lang = profile?.preferredLanguage ?? 'en'
  const dict = getDictionary(lang)

  // A deactivated member keeps a valid session (server actions already reject them),
  // but must not be able to read any restaurant data — lock the whole app behind a
  // dead-end screen with only a sign-out.
  if (profile && !profile.isActive) {
    return <DeactivatedScreen dict={dict} />
  }

  const displayName = profile ? `${profile.firstName} ${profile.lastName}`.trim() : user.email
  const onboarded = Boolean(profile?.restaurantId)
  const isManagement = Boolean(profile && isManagementRole(profile.role))

  return (
    <LanguageProvider dict={dict} lang={lang}>
      <div className="flex min-h-svh flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
          <span className="text-[15px] font-semibold tracking-tight">{dict.appShell.brand}</span>
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="hidden text-sm text-muted-foreground sm:block">{displayName}</span>
            {onboarded && isManagement && (
              <Button
                render={<Link href="/settings" />}
                nativeButton={false}
                variant="ghost"
                size="icon"
                aria-label={dict.appShell.settingsAria}
              >
                <SettingsIcon />
              </Button>
            )}
            <form action={logoutAction}>
              <Button type="submit" variant="outline" size="sm">
                {dict.common.signOut}
              </Button>
            </form>
          </div>
        </header>
        {/* Pad the bottom so the fixed nav never covers content */}
        <main className={onboarded ? 'flex-1 pb-20' : 'flex-1'}>{children}</main>
        {onboarded && profile && <OfflineManager currentUserId={profile.id} />}
        {onboarded && profile && <BottomNav showTeam={isManagement} />}
      </div>
    </LanguageProvider>
  )
}

function DeactivatedScreen({ dict }: { dict: ReturnType<typeof getDictionary> }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">{dict.appShell.deactivatedTitle}</h1>
      <p className="max-w-sm text-muted-foreground">{dict.appShell.deactivatedBody}</p>
      <form action={logoutAction}>
        <Button type="submit" variant="outline">
          {dict.common.signOut}
        </Button>
      </form>
    </div>
  )
}
