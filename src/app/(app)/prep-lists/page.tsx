import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ClipboardListIcon, PlusIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getProfileByUserId } from '@/lib/db/queries/profiles'
import { getPrepListsByRestaurant } from '@/lib/db/queries/prep-lists'
import { translatePrepLists } from '@/lib/translation/apply'
import { getDictionary } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/page-header'
import { PrepListCard } from '../_components/prep-list-card'

export default async function PrepListsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profile = await getProfileByUserId(user.id)
  if (!profile?.restaurantId) redirect('/onboarding')

  const lang = profile.preferredLanguage
  const dict = getDictionary(lang)
  const lists = await translatePrepLists(
    await getPrepListsByRestaurant(profile.restaurantId),
    profile.restaurantId,
    lang
  )

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <PageHeader icon={ClipboardListIcon} title={dict.prepLists.heading} className="mb-0" />
        {profile.canCreateLists && (
          <Button render={<Link href="/prep-lists/new" />} nativeButton={false} className="min-h-[44px] shrink-0">
            <PlusIcon /> {dict.prepLists.newList}
          </Button>
        )}
      </div>

      {lists.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card/50 p-8 text-center text-muted-foreground">
          {profile.canCreateLists ? dict.prepLists.noListsBuilder : dict.prepLists.noListsViewer}
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {lists.map((list) => (
            <li key={list.id}>
              <PrepListCard list={list} lang={lang} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
