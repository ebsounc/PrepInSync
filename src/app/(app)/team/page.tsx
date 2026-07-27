import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProfileByUserId, getProfilesByRestaurant } from '@/lib/db/queries/profiles'
import { UsersIcon } from 'lucide-react'
import { isManagementRole } from '@/lib/auth/roles'
import { getDictionary } from '@/lib/i18n'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/page-header'
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

  const dict = getDictionary(profile.preferredLanguage)

  if (!isManagementRole(profile.role)) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">{dict.team.noPermission}</p>
      </div>
    )
  }

  const members = await getProfilesByRestaurant(profile.restaurantId)

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <PageHeader icon={UsersIcon} title={dict.team.heading} className="mb-6" />

      {/* Roster first: seeing who's on the team is the reason you open this page;
          inviting is the occasional action. */}
      <h2 className="mb-3 text-lg font-medium">{dict.team.rosterHeading}</h2>
      <Roster members={members} currentUserId={user.id} />

      {/* Full width to match the roster — it was max-w-sm inside a max-w-2xl page. */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>{dict.team.inviteTitle}</CardTitle>
          <CardDescription>{dict.team.inviteDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <InviteForm />
        </CardContent>
      </Card>
    </div>
  )
}
