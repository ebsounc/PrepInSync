import 'server-only'
import { and, asc, eq, sql } from 'drizzle-orm'
import { db, prepItems, prepListEntries } from '@/lib/db'

export type PrepItem = typeof prepItems.$inferSelect

export async function getPrepItemsByRestaurant(restaurantId: string): Promise<PrepItem[]> {
  return db
    .select()
    .from(prepItems)
    .where(eq(prepItems.restaurantId, restaurantId))
    .orderBy(asc(prepItems.name))
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
  data: ItemFields & { restaurantId: string; createdBy: string }
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
      createdBy: data.createdBy,
    })
    .returning()
  return row
}

// restaurantId scopes the update so one restaurant can never touch another's items.
export async function updatePrepItem(id: string, restaurantId: string, data: ItemFields) {
  await db
    .update(prepItems)
    .set({
      name: data.name,
      description: data.description,
      defaultQuantity: data.defaultQuantity,
      defaultUnit: data.defaultUnit,
      parQuantity: data.parQuantity,
      parUnit: data.parUnit,
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
