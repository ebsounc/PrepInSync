import 'server-only'
import { and, asc, desc, eq, sql } from 'drizzle-orm'
import { db, prepLists, prepListEntries, prepItems, profiles } from '@/lib/db'

export type PrepList = typeof prepLists.$inferSelect

export type PrepListWithProgress = PrepList & { total: number; done: number }

export type PrepListEntryWithMeta = {
  id: string
  prepItemId: string
  itemName: string
  quantity: string
  unit: string
  isStarred: boolean
  notes: string | null
  cookNote: string | null
  completed: boolean
  completedAt: Date | null
  completedByName: string | null
}

export async function getPrepListsByRestaurant(
  restaurantId: string
): Promise<PrepListWithProgress[]> {
  const rows = await db
    .select({
      id: prepLists.id,
      restaurantId: prepLists.restaurantId,
      title: prepLists.title,
      date: prepLists.date,
      createdBy: prepLists.createdBy,
      createdAt: prepLists.createdAt,
      total: sql<number>`count(${prepListEntries.id})::int`,
      done: sql<number>`count(*) filter (where ${prepListEntries.completed})::int`,
    })
    .from(prepLists)
    .leftJoin(prepListEntries, eq(prepListEntries.prepListId, prepLists.id))
    .where(eq(prepLists.restaurantId, restaurantId))
    .groupBy(prepLists.id)
    .orderBy(desc(prepLists.date), desc(prepLists.createdAt))
  return rows
}

// Scoped by restaurantId — returns null if the list isn't in the caller's restaurant.
// Doubles as the access check for the detail page and entry mutations.
export async function getPrepListById(
  id: string,
  restaurantId: string
): Promise<PrepList | null> {
  const rows = await db
    .select()
    .from(prepLists)
    .where(and(eq(prepLists.id, id), eq(prepLists.restaurantId, restaurantId)))
    .limit(1)
  return rows[0] ?? null
}

// restaurantId scopes the read through the parent list, so the query is
// self-defending even if a caller forgets to verify list ownership first.
export async function getPrepListEntries(
  listId: string,
  restaurantId: string
): Promise<PrepListEntryWithMeta[]> {
  const rows = await db
    .select({
      id: prepListEntries.id,
      prepItemId: prepListEntries.prepItemId,
      itemName: prepItems.name,
      quantity: prepListEntries.quantity,
      unit: prepListEntries.unit,
      isStarred: prepListEntries.isStarred,
      notes: prepListEntries.notes,
      cookNote: prepListEntries.cookNote,
      completed: prepListEntries.completed,
      completedAt: prepListEntries.completedAt,
      completedByFirst: profiles.firstName,
      completedByLast: profiles.lastName,
    })
    .from(prepListEntries)
    .innerJoin(prepLists, eq(prepLists.id, prepListEntries.prepListId))
    .innerJoin(prepItems, eq(prepItems.id, prepListEntries.prepItemId))
    .leftJoin(profiles, eq(profiles.id, prepListEntries.completedBy))
    .where(and(eq(prepListEntries.prepListId, listId), eq(prepLists.restaurantId, restaurantId)))
    .orderBy(desc(prepListEntries.isStarred), asc(prepListEntries.createdAt))

  return rows.map((r) => ({
    id: r.id,
    prepItemId: r.prepItemId,
    itemName: r.itemName,
    quantity: r.quantity,
    unit: r.unit,
    isStarred: r.isStarred,
    notes: r.notes,
    cookNote: r.cookNote,
    completed: r.completed,
    completedAt: r.completedAt,
    completedByName:
      r.completedByFirst || r.completedByLast
        ? `${r.completedByFirst ?? ''} ${r.completedByLast ?? ''}`.trim()
        : null,
  }))
}

export async function createPrepList(data: {
  restaurantId: string
  title: string
  date: string
  createdBy: string
}): Promise<PrepList> {
  const [row] = await db
    .insert(prepLists)
    .values({
      restaurantId: data.restaurantId,
      title: data.title,
      date: data.date,
      createdBy: data.createdBy,
    })
    .returning()
  return row
}

// Entries cascade-delete via the FK (onDelete: 'cascade').
export async function deletePrepList(id: string, restaurantId: string) {
  await db
    .delete(prepLists)
    .where(and(eq(prepLists.id, id), eq(prepLists.restaurantId, restaurantId)))
}
