import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProfileByUserId, getProfilesByRestaurant } from '@/lib/db/queries/profiles'
import { getRestaurantById } from '@/lib/db/queries/restaurants'
import { getRestaurantUnits } from '@/lib/db/queries/restaurant-units'
import { isManagementRole } from '@/lib/auth/roles'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RestaurantForm } from './_components/restaurant-form'
import { UnitsManager } from './_components/units-manager'
import { TransferOwnership } from './_components/transfer-ownership'

export default async function SettingsPage() {
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
        <p className="text-muted-foreground">You don&apos;t have permission to manage settings.</p>
      </div>
    )
  }

  const isOwner = profile.role === 'owner'
  const [restaurant, units, members] = await Promise.all([
    getRestaurantById(profile.restaurantId),
    getRestaurantUnits(profile.restaurantId),
    isOwner ? getProfilesByRestaurant(profile.restaurantId) : Promise.resolve([]),
  ])
  // Eligible new owners: active members other than the current owner.
  const transferTargets = members
    .filter((m) => m.id !== profile.id && m.isActive)
    .map((m) => ({ id: m.id, name: `${m.firstName} ${m.lastName}`.trim() }))

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Restaurant</CardTitle>
          <CardDescription>Update your restaurant&apos;s name and timezone.</CardDescription>
        </CardHeader>
        <CardContent>
          {restaurant && (
            <RestaurantForm
              name={restaurant.name}
              timezone={restaurant.timezone}
              listDefaultDay={restaurant.listDefaultDay}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Custom units</CardTitle>
          <CardDescription>
            Units your restaurant added. Create new ones from the item or list forms.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UnitsManager units={units.map((u) => ({ id: u.id, label: u.label }))} />
        </CardContent>
      </Card>

      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle>Transfer ownership</CardTitle>
            <CardDescription>
              Hand the owner role to another member. You&apos;ll become a General Manager.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TransferOwnership members={transferTargets} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
