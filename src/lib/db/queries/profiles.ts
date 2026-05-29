import 'server-only'
import { eq } from 'drizzle-orm'
import { db, profiles } from '@/lib/db'
import type { ProfileRole } from '@/lib/auth/roles'

export type Profile = typeof profiles.$inferSelect

export async function getProfileByUserId(userId: string): Promise<Profile | null> {
  const rows = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1)
  return rows[0] ?? null
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
