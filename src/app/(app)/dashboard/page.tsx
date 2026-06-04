import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ClipboardListIcon, PlusIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getProfileByUserId } from '@/lib/db/queries/profiles'
import { getRestaurantById } from '@/lib/db/queries/restaurants'
import { getPrepListsByRestaurant } from '@/lib/db/queries/prep-lists'
import { Button } from '@/components/ui/button'
import { PrepListCard } from '../_components/prep-list-card'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profile = await getProfileByUserId(user.id)
  if (!profile?.restaurantId) redirect('/onboarding')

  const restaurant = await getRestaurantById(profile.restaurantId)
  // "Today" is computed in the restaurant's timezone (en-CA formats as YYYY-MM-DD).
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: restaurant?.timezone ?? 'UTC',
  }).format(new Date())

  const lists = await getPrepListsByRestaurant(profile.restaurantId)
  const todays = lists.filter((l) => l.date === today)

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold">Hi, {profile.firstName}</h1>
          <p className="text-sm text-muted-foreground">Today · {today}</p>
        </div>
        {profile.canCreateLists && (
          <Button render={<Link href="/prep-lists/new" />} className="min-h-[44px] shrink-0">
            <PlusIcon /> New list
          </Button>
        )}
      </div>

      <h2 className="mb-2 text-sm font-medium text-muted-foreground">Today&apos;s prep</h2>
      {todays.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
          <ClipboardListIcon className="mx-auto mb-2 size-6" />
          <p>No prep lists for today.</p>
          {profile.canCreateLists && <p className="mt-1 text-sm">Create one to get started.</p>}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {todays.map((list) => (
            <li key={list.id}>
              <PrepListCard list={list} />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6">
        <Link href="/prep-lists" className="text-sm text-primary hover:underline">
          View all prep lists →
        </Link>
      </div>
    </div>
  )
}
