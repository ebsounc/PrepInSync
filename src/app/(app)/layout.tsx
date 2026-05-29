import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProfileByUserId } from '@/lib/db/queries/profiles'
import { logoutAction } from '@/app/(auth)/actions'
import { Button } from '@/components/ui/button'

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

  const displayName = profile ? `${profile.firstName} ${profile.lastName}`.trim() : user.email

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-14 items-center justify-between border-b px-4 sm:px-6">
        <span className="font-semibold">KitchenPrep</span>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:block">{displayName}</span>
          <form action={logoutAction}>
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  )
}
