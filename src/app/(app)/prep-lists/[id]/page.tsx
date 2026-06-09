import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { CheckCircle2Icon } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getProfileByUserId } from '@/lib/db/queries/profiles'
import { getPrepListById, getPrepListEntries } from '@/lib/db/queries/prep-lists'
import { getPrepItemsByRestaurant } from '@/lib/db/queries/prep-items'
import { getRestaurantUnits } from '@/lib/db/queries/restaurant-units'
import {
  translatePrepItems,
  translatePrepListEntries,
  translateListTitle,
  getCustomUnitLabelMap,
} from '@/lib/translation/apply'
import { Button } from '@/components/ui/button'
import { AddEntryRow } from './_components/add-entry-row'
import { EntryRow } from './_components/entry-row'
import { EditListForm } from './_components/edit-list-form'
import { DeleteListButton } from './_components/delete-list-button'
import { TranslationCorrections, type Correctable } from '@/components/translation-corrections'

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
  const lang = profile.preferredLanguage
  const [rawEntries, rawItems, units] = await Promise.all([
    getPrepListEntries(list.id, profile.restaurantId),
    canManage ? getPrepItemsByRestaurant(profile.restaurantId) : Promise.resolve([]),
    getRestaurantUnits(profile.restaurantId),
  ])
  const [entries, items, customUnitLabels, titleDisplay] = await Promise.all([
    translatePrepListEntries(rawEntries, profile.restaurantId, lang),
    translatePrepItems(rawItems, profile.restaurantId, lang),
    getCustomUnitLabelMap(profile.restaurantId, lang),
    translateListTitle(list, profile.restaurantId, lang),
  ])
  const customUnits = units.map((u) => u.label)

  // Translated fields the viewer could correct (item name shares the items-page key).
  // Dedupe by key — the same item can appear on multiple entries.
  const corrections: Correctable[] = []
  const seen = new Set<string>()
  const add = (c: Correctable) => {
    const k = `${c.entityType}:${c.entityId}:${c.field}`
    if (!seen.has(k)) {
      seen.add(k)
      corrections.push(c)
    }
  }
  for (const e of entries) {
    if (e.itemSourceLanguage !== lang) {
      add({
        entityType: 'prep_item',
        entityId: e.prepItemId,
        field: 'name',
        label: 'Item',
        sourceText: e.itemName,
        sourceLanguage: e.itemSourceLanguage,
        currentTranslation: e.itemNameDisplay,
      })
    }
    if (e.notes && e.notesDisplay && e.notesSourceLanguage !== lang) {
      add({
        entityType: 'prep_list_entry',
        entityId: e.id,
        field: 'notes',
        label: 'Instructions',
        sourceText: e.notes,
        sourceLanguage: e.notesSourceLanguage,
        currentTranslation: e.notesDisplay,
      })
    }
    if (e.cookNote && e.cookNoteDisplay && e.cookNoteSourceLanguage !== lang) {
      add({
        entityType: 'prep_list_entry',
        entityId: e.id,
        field: 'cook_note',
        label: 'Note',
        sourceText: e.cookNote,
        sourceLanguage: e.cookNoteSourceLanguage,
        currentTranslation: e.cookNoteDisplay,
      })
    }
  }

  const done = entries.filter((e) => e.completed).length
  const pct = entries.length > 0 ? Math.round((done / entries.length) * 100) : 0
  const allDone = entries.length > 0 && done === entries.length

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <header className="mb-4">
        <div className="flex items-start justify-between gap-2">
          <EditListForm
            list={{ id: list.id, title: list.title, date: list.date }}
            titleDisplay={titleDisplay}
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
              name: i.nameDisplay,
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
              customUnitLabels={customUnitLabels}
              lang={lang}
              currentUserId={profile.id}
            />
          ))}
        </ul>
      )}

      {corrections.length > 0 && (
        <div className="mt-4">
          <TranslationCorrections items={corrections} targetLanguage={lang} />
        </div>
      )}

      <div className="mt-6">
        <Button render={<Link href="/prep-lists" />} nativeButton={false} variant="outline" className="min-h-[48px] w-full">
          Done
        </Button>
      </div>
    </div>
  )
}
