import 'server-only'
import { eq } from 'drizzle-orm'
import { db, profiles, restaurants } from '@/lib/db'

export type Restaurant = typeof restaurants.$inferSelect

export async function getRestaurantById(id: string): Promise<Restaurant | null> {
  const rows = await db.select().from(restaurants).where(eq(restaurants.id, id)).limit(1)
  return rows[0] ?? null
}

export async function updateRestaurant(
  id: string,
  data: { name: string; timezone: string; listDefaultDay: 'today' | 'next_day' }
) {
  await db
    .update(restaurants)
    .set({ name: data.name, timezone: data.timezone, listDefaultDay: data.listDefaultDay })
    .where(eq(restaurants.id, id))
}

// Creates the restaurant and updates the profile atomically.
// Used only during account-owner onboarding.
export async function createRestaurantAndOnboardProfile(
  userId: string,
  data: { name: string; timezone: string }
): Promise<Restaurant> {
  let created: Restaurant | undefined

  await db.transaction(async (tx) => {
    const [restaurant] = await tx
      .insert(restaurants)
      .values({ name: data.name, timezone: data.timezone })
      .returning()

    await tx
      .update(profiles)
      .set({ restaurantId: restaurant.id, role: 'owner', canCreateLists: true })
      .where(eq(profiles.id, userId))

    created = restaurant
  })

  return created!
}
