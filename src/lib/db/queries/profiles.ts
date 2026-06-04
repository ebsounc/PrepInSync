import 'server-only'
import { and, asc, eq } from 'drizzle-orm'
import { db, profiles } from '@/lib/db'
import type { ProfileRole } from '@/lib/auth/roles'

export type Profile = typeof profiles.$inferSelect

export async function getProfileByUserId(userId: string): Promise<Profile | null> {
  const rows = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1)
  return rows[0] ?? null
}

export async function getProfilesByRestaurant(restaurantId: string): Promise<Profile[]> {
  return db
    .select()
    .from(profiles)
    .where(eq(profiles.restaurantId, restaurantId))
    .orderBy(asc(profiles.createdAt))
}

// restaurantId scopes the write so management can only toggle their own roster.
export async function setCanCreateLists(
  targetId: string,
  restaurantId: string,
  value: boolean
) {
  await db
    .update(profiles)
    .set({ canCreateLists: value })
    .where(and(eq(profiles.id, targetId), eq(profiles.restaurantId, restaurantId)))
}

export async function setProfileActive(
  targetId: string,
  restaurantId: string,
  value: boolean
) {
  await db
    .update(profiles)
    .set({ isActive: value })
    .where(and(eq(profiles.id, targetId), eq(profiles.restaurantId, restaurantId)))
}

export async function updateProfile(
  userId: string,
  data: { restaurantId: string; role: ProfileRole; canCreateLists: boolean }
) {
  await db
    .update(profiles)
    .set({
      restaurantId: data.restaurantId,
      role: data.role,
      canCreateLists: data.canCreateLists,
    })
    .where(eq(profiles.id, userId))
}
