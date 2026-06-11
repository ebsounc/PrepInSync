import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ClipboardListIcon, PlusIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getProfileByUserId } from '@/lib/db/queries/profiles'
import { getRestaurantById } from '@/lib/db/queries/restaurants'
import { getPrepListsByRestaurant, getPrepListEntries } from '@/lib/db/queries/prep-lists'
import { translatePrepLists, translatePrepListEntries } from '@/lib/translation/apply'
import { formatListDate, greetingKey } from '@/lib/format'
import { getDictionary, interpolate } from '@/lib/i18n'
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
  const timezone = restaurant?.timezone ?? 'UTC'
  // "Today" is computed in the restaurant's timezone (en-CA formats as YYYY-MM-DD).
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date())
  const lang = profile.preferredLanguage
  const dict = getDictionary(lang)
  const greeting = dict.greeting[greetingKey(timezone)]
  const lists = await getPrepListsByRestaurant(profile.restaurantId)
  const todays = await translatePrepLists(
    lists.filter((l) => l.date === today),
    profile.restaurantId,
    lang
  )
  // Fetch entries for today's lists so the card can show a read-only preview checklist.
  // Translate them all in ONE batched call (not one per list) — on a cold cache that's
  // a single LLM round-trip for the whole dashboard. Re-group by list afterward.
  const rawByList = await Promise.all(
    todays.map((list) => getPrepListEntries(list.id, profile.restaurantId!))
  )
  const translatedFlat = await translatePrepListEntries(
    rawByList.flat(),
    profile.restaurantId,
    lang
  )
  let offset = 0
  const todaysWithEntries = todays.map((list, i) => {
    const entries = translatedFlat.slice(offset, offset + rawByList[i].length)
    offset += rawByList[i].length
    return { list, entries }
  })

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold">
            {interpolate(dict.dashboard.greetingName, { greeting, name: profile.firstName })}
          </h1>
          <p className="text-sm text-muted-foreground">{formatListDate(today, lang)}</p>
        </div>
        {profile.canCreateLists && (
          <Button
            render={<Link href="/prep-lists/new" />}
            nativeButton={false}
            className="min-h-[44px] shrink-0"
          >
            <PlusIcon /> {dict.prepLists.newList}
          </Button>
        )}
      </div>

      <h2 className="mb-2 text-sm font-medium text-muted-foreground">{dict.dashboard.todaysPrep}</h2>
      {todays.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
          <ClipboardListIcon className="mx-auto mb-2 size-6" />
          <p>{dict.dashboard.noListsToday}</p>
          {profile.canCreateLists && <p className="mt-1 text-sm">{dict.dashboard.createToStart}</p>}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {todaysWithEntries.map(({ list, entries }) => (
            <li key={list.id}>
              <PrepListCard list={list} entries={entries} lang={lang} />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6">
        <Link href="/prep-lists" className="text-sm text-primary hover:underline">
          {dict.dashboard.viewAll}
        </Link>
      </div>
    </div>
  )
}
