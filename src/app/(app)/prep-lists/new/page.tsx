import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProfileByUserId } from '@/lib/db/queries/profiles'
import { getRestaurantById } from '@/lib/db/queries/restaurants'
import { ClipboardListIcon } from 'lucide-react'
import { getDictionary, interpolate } from '@/lib/i18n'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/page-header'
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

  const restaurant = await getRestaurantById(profile.restaurantId)
  const timezone = restaurant?.timezone ?? 'UTC'

  // Compute the default date server-side (in the restaurant's timezone) so the value
  // is identical on server and client — no hydration mismatch. The restaurant's
  // list-day preference decides today vs. the next day.
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date())
  const nextDay = new Date(`${today}T00:00:00Z`)
  nextDay.setUTCDate(nextDay.getUTCDate() + 1)
  const tomorrow = nextDay.toISOString().slice(0, 10)
  const defaultDate = restaurant?.listDefaultDay === 'next_day' ? tomorrow : today

  const lang = profile.preferredLanguage
  const dict = getDictionary(lang)
  // A friendly hint based on the target day's weekday, e.g. "Friday a.m. prep".
  const weekday = new Intl.DateTimeFormat(lang === 'es' ? 'es-ES' : 'en-US', {
    weekday: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${defaultDate}T00:00:00Z`))
  // If the list is for today and it's already afternoon, suggest "p.m." instead of "a.m.".
  const hour = Number(
    new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: timezone }).format(
      new Date()
    )
  )
  const period = defaultDate === today && hour >= 12 ? 'p.m.' : 'a.m.'

  return (
    <div className="mx-auto max-w-md p-4 sm:p-6">
      <PageHeader icon={ClipboardListIcon} title={dict.prepLists.newListHeading} />
      <Card>
        <CardHeader>
          <CardTitle>{dict.prepLists.detailsCard}</CardTitle>
        </CardHeader>
        <CardContent>
          <NewListForm
            defaultDate={defaultDate}
            titleHint={interpolate(dict.prepLists.titleHint, { weekday, period })}
          />
        </CardContent>
      </Card>
    </div>
  )
}
