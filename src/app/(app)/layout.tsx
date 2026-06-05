import Link from 'next/link'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { SettingsIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getProfileByUserId } from '@/lib/db/queries/profiles'
import { isManagementRole } from '@/lib/auth/roles'
import { logoutAction } from '@/app/(auth)/actions'
import { Button } from '@/components/ui/button'
import { BottomNav } from './_components/bottom-nav'

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

  // A deactivated member keeps a valid session (server actions already reject them),
  // but must not be able to read any restaurant data — lock the whole app behind a
  // dead-end screen with only a sign-out.
  if (profile && !profile.isActive) {
    return <DeactivatedScreen />
  }

  const displayName = profile ? `${profile.firstName} ${profile.lastName}`.trim() : user.email
  const onboarded = Boolean(profile?.restaurantId)
  const isManagement = Boolean(profile && isManagementRole(profile.role))

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-14 items-center justify-between border-b px-4 sm:px-6">
        <span className="font-semibold">KitchenPrep</span>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:block">{displayName}</span>
          {onboarded && isManagement && (
            <Button
              render={<Link href="/settings" />}
              nativeButton={false}
              variant="ghost"
              size="icon"
              aria-label="Settings"
            >
              <SettingsIcon />
            </Button>
          )}
          <form action={logoutAction}>
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </header>
      {/* Pad the bottom so the fixed nav never covers content */}
      <main className={onboarded ? 'flex-1 pb-20' : 'flex-1'}>{children}</main>
      {onboarded && profile && <BottomNav showTeam={isManagement} />}
    </div>
  )
}

function DeactivatedScreen() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">Account deactivated</h1>
      <p className="max-w-sm text-muted-foreground">
        Your access to this kitchen has been turned off. Contact your manager if you think this is a
        mistake.
      </p>
      <form action={logoutAction}>
        <Button type="submit" variant="outline">
          Sign out
        </Button>
      </form>
    </div>
  )
}
