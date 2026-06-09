import 'server-only'
import { and, asc, eq } from 'drizzle-orm'
import { db, restaurantUnits } from '@/lib/db'
import { UNIT_VALUES } from '@/lib/units'

export type RestaurantUnit = typeof restaurantUnits.$inferSelect

// Custom units with the creator's language, for runtime translation of the label.
export type RestaurantUnitForTranslation = {
  id: string
  label: string
  sourceLanguage: 'en' | 'es'
}

export async function getRestaurantUnitsForTranslation(
  restaurantId: string
): Promise<RestaurantUnitForTranslation[]> {
  return db
    .select({
      id: restaurantUnits.id,
      label: restaurantUnits.label,
      sourceLanguage: restaurantUnits.sourceLanguage,
    })
    .from(restaurantUnits)
    .where(eq(restaurantUnits.restaurantId, restaurantId))
    .orderBy(asc(restaurantUnits.label))
}

// A unit submitted on an item/entry is valid if it's a built-in OR a custom unit
// belonging to this restaurant. Used by the item/entry actions at write time.
export async function isValidUnit(restaurantId: string, unit: string): Promise<boolean> {
  if ((UNIT_VALUES as readonly string[]).includes(unit)) return true
  const [row] = await db
    .select({ id: restaurantUnits.id })
    .from(restaurantUnits)
    .where(and(eq(restaurantUnits.restaurantId, restaurantId), eq(restaurantUnits.label, unit)))
    .limit(1)
  return Boolean(row)
}

export async function getRestaurantUnits(restaurantId: string): Promise<RestaurantUnit[]> {
  return db
    .select()
    .from(restaurantUnits)
    .where(eq(restaurantUnits.restaurantId, restaurantId))
    .orderBy(asc(restaurantUnits.label))
}

// Idempotent on (restaurant_id, label): a duplicate label returns the existing row
// instead of erroring, so re-adding a unit just selects it.
export async function createRestaurantUnit(data: {
  restaurantId: string
  label: string
  sourceLanguage: 'en' | 'es'
  createdBy: string
}): Promise<RestaurantUnit> {
  const [row] = await db
    .insert(restaurantUnits)
    .values({
      restaurantId: data.restaurantId,
      label: data.label,
      sourceLanguage: data.sourceLanguage,
      createdBy: data.createdBy,
    })
    .onConflictDoNothing({ target: [restaurantUnits.restaurantId, restaurantUnits.label] })
    .returning()
  if (row) return row
  const [existing] = await db
    .select()
    .from(restaurantUnits)
    .where(
      and(
        eq(restaurantUnits.restaurantId, data.restaurantId),
        eq(restaurantUnits.label, data.label)
      )
    )
    .limit(1)
  return existing
}

// restaurantId scopes the delete so one restaurant can't remove another's units.
export async function deleteRestaurantUnit(id: string, restaurantId: string) {
  await db
    .delete(restaurantUnits)
    .where(and(eq(restaurantUnits.id, id), eq(restaurantUnits.restaurantId, restaurantId)))
}
