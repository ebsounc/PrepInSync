import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProfileByUserId } from '@/lib/db/queries/profiles'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NewListForm } from './_components/new-list-form'

export default async function NewPrepListPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profile = await getProfileByUserId(user.id)
  if (!profile?.restaurantId) redirect('/onboarding')
  if (!profile.canCreateLists) redirect('/prep-lists')

  return (
    <div className="mx-auto max-w-md p-4 sm:p-6">
      <h1 className="mb-4 text-2xl font-semibold">New prep list</h1>
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <NewListForm />
        </CardContent>
      </Card>
    </div>
  )
}
