import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProfileByUserId } from '@/lib/db/queries/profiles'
import { getPrepItemsByRestaurant } from '@/lib/db/queries/prep-items'
import { getRecipeItemIds } from '@/lib/db/queries/recipes'
import { getRestaurantUnits } from '@/lib/db/queries/restaurant-units'
import { translatePrepItems, getCustomUnitLabelMap } from '@/lib/translation/apply'
import { getDictionary } from '@/lib/i18n'
import { ItemsList } from './_components/items-list'

export default async function ItemsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profile = await getProfileByUserId(user.id)
  if (!profile?.restaurantId) redirect('/onboarding')

  const lang = profile.preferredLanguage
  const [items, units] = await Promise.all([
    getPrepItemsByRestaurant(profile.restaurantId),
    getRestaurantUnits(profile.restaurantId),
  ])
  const [translatedItems, customUnitLabels, recipeItemIds] = await Promise.all([
    translatePrepItems(items, profile.restaurantId, lang),
    getCustomUnitLabelMap(profile.restaurantId, lang),
    getRecipeItemIds(
      profile.restaurantId,
      items.map((i) => i.id)
    ),
  ])

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <h1 className="mb-4 text-2xl font-semibold">{getDictionary(lang).items.heading}</h1>
      <ItemsList
        items={translatedItems}
        canManage={profile.canCreateLists}
        customUnits={units.map((u) => u.label)}
        customUnitLabels={customUnitLabels}
        recipeItemIds={[...recipeItemIds]}
        lang={lang}
      />
    </div>
  )
}
