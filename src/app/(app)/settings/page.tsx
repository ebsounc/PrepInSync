import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProfileByUserId, getProfilesByRestaurant } from '@/lib/db/queries/profiles'
import { getRestaurantById } from '@/lib/db/queries/restaurants'
import { getRestaurantUnits } from '@/lib/db/queries/restaurant-units'
import { SettingsIcon } from 'lucide-react'
import { isManagementRole } from '@/lib/auth/roles'
import { getDictionary } from '@/lib/i18n'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/page-header'
import { RestaurantForm } from './_components/restaurant-form'
import { UnitsManager } from './_components/units-manager'
import { TransferOwnership } from './_components/transfer-ownership'
import { LanguageForm } from './_components/language-form'
import { AppearanceForm } from './_components/appearance-form'

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profile = await getProfileByUserId(user.id)
  if (!profile?.restaurantId) redirect('/onboarding')

  const dict = getDictionary(profile.preferredLanguage)
  // Language is a per-user setting — shown to everyone. The rest of the page is
  // management-only.
  const isManagement = isManagementRole(profile.role)
  const isOwner = profile.role === 'owner'
  const [restaurant, units, members] = isManagement
    ? await Promise.all([
        getRestaurantById(profile.restaurantId),
        getRestaurantUnits(profile.restaurantId),
        isOwner ? getProfilesByRestaurant(profile.restaurantId) : Promise.resolve([]),
      ])
    : [null, [], []]
  // Eligible new owners: active members other than the current owner.
  const transferTargets = members
    .filter((m) => m.id !== profile.id && m.isActive)
    .map((m) => ({ id: m.id, name: `${m.firstName} ${m.lastName}`.trim() }))

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4 sm:p-6">
      <PageHeader icon={SettingsIcon} title={dict.settings.heading} className="mb-0" />

      <Card>
        <CardHeader>
          <CardTitle>{dict.settings.appearanceTitle}</CardTitle>
          <CardDescription>{dict.settings.appearanceDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <AppearanceForm currentTheme={profile.theme} currentAccent={profile.accentColor} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{dict.settings.languageTitle}</CardTitle>
          <CardDescription>{dict.settings.languageDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <LanguageForm current={profile.preferredLanguage} />
        </CardContent>
      </Card>

      {isManagement && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{dict.settings.restaurantTitle}</CardTitle>
              <CardDescription>{dict.settings.restaurantDesc}</CardDescription>
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
              <CardTitle>{dict.settings.customUnitsTitle}</CardTitle>
              <CardDescription>{dict.settings.customUnitsDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <UnitsManager units={units.map((u) => ({ id: u.id, label: u.label }))} />
            </CardContent>
          </Card>

          {isOwner && (
            <Card>
              <CardHeader>
                <CardTitle>{dict.settings.transferTitle}</CardTitle>
                <CardDescription>{dict.settings.transferDesc}</CardDescription>
              </CardHeader>
              <CardContent>
                <TransferOwnership members={transferTargets} />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
