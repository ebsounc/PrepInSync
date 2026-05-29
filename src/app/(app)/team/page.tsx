import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProfileByUserId } from '@/lib/db/queries/profiles'
import { isManagementRole } from '@/lib/auth/roles'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InviteForm } from './_components/invite-form'

export default async function TeamPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const profile = await getProfileByUserId(user.id)

  if (!profile || !isManagementRole(profile.role)) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">You don&apos;t have permission to manage team members.</p>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6">
      <h1 className="mb-6 text-2xl font-semibold">Team</h1>
      <div className="max-w-sm">
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
    </div>
  )
}
