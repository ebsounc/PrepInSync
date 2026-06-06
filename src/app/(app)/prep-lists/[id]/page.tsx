import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { CheckCircle2Icon } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getProfileByUserId } from '@/lib/db/queries/profiles'
import { getPrepListById, getPrepListEntries } from '@/lib/db/queries/prep-lists'
import { getPrepItemsByRestaurant } from '@/lib/db/queries/prep-items'
import { getRestaurantUnits } from '@/lib/db/queries/restaurant-units'
import { Button } from '@/components/ui/button'
import { AddEntryRow } from './_components/add-entry-row'
import { EntryRow } from './_components/entry-row'
import { EditListForm } from './_components/edit-list-form'
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

  const canManage = profile.canCreateLists
  const [entries, items, units] = await Promise.all([
    getPrepListEntries(list.id, profile.restaurantId),
    canManage ? getPrepItemsByRestaurant(profile.restaurantId) : Promise.resolve([]),
    getRestaurantUnits(profile.restaurantId),
  ])
  const customUnits = units.map((u) => u.label)
  const done = entries.filter((e) => e.completed).length
  const pct = entries.length > 0 ? Math.round((done / entries.length) * 100) : 0
  const allDone = entries.length > 0 && done === entries.length

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <header className="mb-4">
        <div className="flex items-start justify-between gap-2">
          <EditListForm
            list={{ id: list.id, title: list.title, date: list.date }}
            canManage={canManage}
          />
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
        {allDone && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
            <CheckCircle2Icon className="size-5 shrink-0" /> All done — nice work!
          </div>
        )}
      </header>

      {canManage && (
        <div className="mb-4">
          <AddEntryRow
            listId={list.id}
            items={items.map((i) => ({
              id: i.id,
              name: i.name,
              defaultQuantity: i.defaultQuantity,
              defaultUnit: i.defaultUnit,
            }))}
            customUnits={customUnits}
            existingItemIds={entries.map((e) => e.prepItemId)}
          />
        </div>
      )}

      {entries.length === 0 ? (
        <p className="text-muted-foreground">
          {canManage ? 'No items on this list yet. Add some above.' : 'No items on this list yet.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map((entry) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              canManage={canManage}
              customUnits={customUnits}
              currentUserId={profile.id}
            />
          ))}
        </ul>
      )}

      <div className="mt-6">
        <Button render={<Link href="/prep-lists" />} nativeButton={false} variant="outline" className="min-h-[48px] w-full">
          Done
        </Button>
      </div>
    </div>
  )
}
