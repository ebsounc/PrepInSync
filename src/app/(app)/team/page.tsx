import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProfileByUserId, getProfilesByRestaurant } from '@/lib/db/queries/profiles'
import { isManagementRole } from '@/lib/auth/roles'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InviteForm } from './_components/invite-form'
import { Roster } from './_components/roster'

export default async function TeamPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const profile = await getProfileByUserId(user.id)
  if (!profile?.restaurantId) redirect('/onboarding')

  if (!isManagementRole(profile.role)) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">You don&apos;t have permission to manage team members.</p>
      </div>
    )
  }

  const members = await getProfilesByRestaurant(profile.restaurantId)

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <h1 className="mb-6 text-2xl font-semibold">Team</h1>

      <div className="mx-auto mb-8 max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle>Invite a team member</CardTitle>
            <CardDescription>
              They&apos;ll receive an email to set up their account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InviteForm />
          </CardContent>
        </Card>
      </div>

      <h2 className="mb-3 text-lg font-medium">Roster</h2>
      <Roster members={members} currentUserId={user.id} />
    </div>
  )
}
