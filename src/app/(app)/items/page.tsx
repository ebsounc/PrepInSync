import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProfileByUserId } from '@/lib/db/queries/profiles'
import { getPrepItemsByRestaurant } from '@/lib/db/queries/prep-items'
import { getRestaurantUnits } from '@/lib/db/queries/restaurant-units'
import { ItemsList } from './_components/items-list'

export default async function ItemsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profile = await getProfileByUserId(user.id)
  if (!profile?.restaurantId) redirect('/onboarding')

  const [items, units] = await Promise.all([
    getPrepItemsByRestaurant(profile.restaurantId),
    getRestaurantUnits(profile.restaurantId),
  ])

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <h1 className="mb-4 text-2xl font-semibold">Items</h1>
      <ItemsList
        items={items}
        canManage={profile.canCreateLists}
        customUnits={units.map((u) => u.label)}
      />
    </div>
  )
}
