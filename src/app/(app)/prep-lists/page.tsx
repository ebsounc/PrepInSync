import Link from 'next/link'
import { redirect } from 'next/navigation'
import { PlusIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getProfileByUserId } from '@/lib/db/queries/profiles'
import { getPrepListsByRestaurant } from '@/lib/db/queries/prep-lists'
import { Button } from '@/components/ui/button'
import { PrepListCard } from '../_components/prep-list-card'

export default async function PrepListsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profile = await getProfileByUserId(user.id)
  if (!profile?.restaurantId) redirect('/onboarding')

  const lists = await getPrepListsByRestaurant(profile.restaurantId)

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Prep lists</h1>
        {profile.canCreateLists && (
          <Button render={<Link href="/prep-lists/new" />} className="min-h-[44px]">
            <PlusIcon /> New list
          </Button>
        )}
      </div>

      {lists.length === 0 ? (
        <p className="text-muted-foreground">
          {profile.canCreateLists
            ? 'No prep lists yet. Create one to get started.'
            : 'No prep lists yet.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {lists.map((list) => (
            <li key={list.id}>
              <PrepListCard list={list} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
