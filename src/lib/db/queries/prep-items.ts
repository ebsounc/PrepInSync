import 'server-only'
import { and, asc, eq, sql } from 'drizzle-orm'
import { db, prepItems, prepListEntries } from '@/lib/db'

export type PrepItem = typeof prepItems.$inferSelect

export async function getPrepItemsByRestaurant(restaurantId: string): Promise<PrepItem[]> {
  return db
    .select()
    .from(prepItems)
    .where(eq(prepItems.restaurantId, restaurantId))
    // `id` breaks ties so two items sharing a name keep a stable relative order.
    .orderBy(asc(prepItems.name), asc(prepItems.id))
}

// Scoped lookup — returns null if the item isn't in the caller's restaurant.
export async function getPrepItemById(
  id: string,
  restaurantId: string
): Promise<PrepItem | null> {
  const rows = await db
    .select()
    .from(prepItems)
    .where(and(eq(prepItems.id, id), eq(prepItems.restaurantId, restaurantId)))
    .limit(1)
  return rows[0] ?? null
}

type ItemFields = {
  name: string
  description: string | null
  defaultQuantity: string | null
  defaultUnit: string | null
  parQuantity: string | null
  parUnit: string | null
}

export async function createPrepItem(
  data: ItemFields & {
    restaurantId: string
    createdBy: string
    sourceLanguage: 'en' | 'es'
  }
): Promise<PrepItem> {
  const [row] = await db
    .insert(prepItems)
    .values({
      restaurantId: data.restaurantId,
      name: data.name,
      description: data.description,
      defaultQuantity: data.defaultQuantity,
      defaultUnit: data.defaultUnit,
      parQuantity: data.parQuantity,
      parUnit: data.parUnit,
      // The language the item was authored in — drives which direction it
      // translates. Left untouched on update so edits don't flip the source.
      sourceLanguage: data.sourceLanguage,
      createdBy: data.createdBy,
    })
    .returning()
  return row
}

// restaurantId scopes the update so one restaurant can never touch another's items.
// sourceLanguage is re-stamped to the editor's language — the text is theirs now.
export async function updatePrepItem(
  id: string,
  restaurantId: string,
  data: ItemFields & { sourceLanguage: 'en' | 'es' }
) {
  await db
    .update(prepItems)
    .set({
      name: data.name,
      description: data.description,
      defaultQuantity: data.defaultQuantity,
      defaultUnit: data.defaultUnit,
      parQuantity: data.parQuantity,
      parUnit: data.parUnit,
      sourceLanguage: data.sourceLanguage,
      updatedAt: new Date(),
    })
    .where(and(eq(prepItems.id, id), eq(prepItems.restaurantId, restaurantId)))
}

// prep_list_entries.prep_item_id has no ON DELETE cascade, so deleting an item that
// is referenced by any entry would raise an FK error — check first.
export async function isPrepItemInUse(id: string): Promise<boolean> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(prepListEntries)
    .where(eq(prepListEntries.prepItemId, id))
  return (row?.n ?? 0) > 0
}

export async function deletePrepItem(id: string, restaurantId: string) {
  await db
    .delete(prepItems)
    .where(and(eq(prepItems.id, id), eq(prepItems.restaurantId, restaurantId)))
}

// Sets (or clears, with null) the thumbnail object PATH. Scoped by restaurantId.
export async function setPrepItemImageUrl(
  id: string,
  restaurantId: string,
  imageUrl: string | null
) {
  await db
    .update(prepItems)
    .set({ imageUrl, updatedAt: new Date() })
    .where(and(eq(prepItems.id, id), eq(prepItems.restaurantId, restaurantId)))
}
