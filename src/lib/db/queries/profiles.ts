import 'server-only'
import { and, asc, eq } from 'drizzle-orm'
import { db, profiles } from '@/lib/db'
import type { ProfileRole } from '@/lib/auth/roles'

export type Profile = typeof profiles.$inferSelect

export async function getProfileByUserId(userId: string): Promise<Profile | null> {
  const rows = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1)
  return rows[0] ?? null
}

// Self-service: a user sets their own reading/writing language (any member).
export async function setPreferredLanguage(userId: string, lang: 'en' | 'es') {
  await db.update(profiles).set({ preferredLanguage: lang }).where(eq(profiles.id, userId))
}

// Self-service: a user sets their own appearance (any member). accentColor null
// clears back to the baked-in default. Validate accentColor before calling.
export async function setAppearance(
  userId: string,
  theme: 'light' | 'dark' | 'system',
  accentColor: string | null
) {
  await db.update(profiles).set({ theme, accentColor }).where(eq(profiles.id, userId))
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

// restaurantId scopes the write so management can only change their own roster.
// canCreateLists is reset to the new role's default so a demotion doesn't silently
// leave list-building access behind (and a promotion grants it).
export async function setProfileRole(
  targetId: string,
  restaurantId: string,
  role: ProfileRole,
  canCreateLists: boolean
) {
  await db
    .update(profiles)
    .set({ role, canCreateLists })
    .where(and(eq(profiles.id, targetId), eq(profiles.restaurantId, restaurantId)))
}

// Atomically hand ownership to another member: the old owner steps down to
// general_manager, then the target becomes owner. Both writes are scoped to the
// restaurant. Demotion happens FIRST so the `one_owner_per_restaurant` partial unique
// index is never momentarily violated; under a concurrent double-transfer the second
// promotion hits that index and the transaction rolls back.
export async function transferOwnership(
  restaurantId: string,
  fromUserId: string,
  toUserId: string
) {
  await db.transaction(async (tx) => {
    await tx
      .update(profiles)
      .set({ role: 'general_manager', canCreateLists: true })
      .where(
        and(
          eq(profiles.id, fromUserId),
          eq(profiles.restaurantId, restaurantId),
          eq(profiles.role, 'owner')
        )
      )
    await tx
      .update(profiles)
      .set({ role: 'owner', canCreateLists: true })
      .where(and(eq(profiles.id, toUserId), eq(profiles.restaurantId, restaurantId)))
  })
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
