import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProfileByUserId } from '@/lib/db/queries/profiles'
import { getPrepListById, getPrepListEntries } from '@/lib/db/queries/prep-lists'
import { getPrepItemsByRestaurant } from '@/lib/db/queries/prep-items'
import { AddEntryRow } from './_components/add-entry-row'
import { EntryRow } from './_components/entry-row'
import { DeleteListButton } from './_components/delete-list-button'

export default async function PrepListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profile = await getProfileByUserId(user.id)
  if (!profile?.restaurantId) redirect('/onboarding')

  const list = await getPrepListById(id, profile.restaurantId)
  if (!list) notFound()

  const entries = await getPrepListEntries(list.id)
  const canManage = profile.canCreateLists
  const items = canManage ? await getPrepItemsByRestaurant(profile.restaurantId) : []
  const done = entries.filter((e) => e.completed).length
  const pct = entries.length > 0 ? Math.round((done / entries.length) * 100) : 0

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <header className="mb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold">{list.title}</h1>
            <p className="text-sm text-muted-foreground">{list.date}</p>
          </div>
          {canManage && <DeleteListButton listId={list.id} />}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {done}/{entries.length} done
          </span>
        </div>
      </header>

      {canManage && (
        <div className="mb-4">
          <AddEntryRow listId={list.id} items={items.map((i) => ({ id: i.id, name: i.name }))} />
        </div>
      )}

      {entries.length === 0 ? (
        <p className="text-muted-foreground">
          {canManage ? 'No items on this list yet. Add some above.' : 'No items on this list yet.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map((entry) => (
            <EntryRow key={entry.id} entry={entry} canManage={canManage} />
          ))}
        </ul>
      )}
    </div>
  )
}
