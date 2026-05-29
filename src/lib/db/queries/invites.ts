import 'server-only'
import { and, eq, isNull } from 'drizzle-orm'
import { db, invites } from '@/lib/db'
import type { ProfileRole } from '@/lib/auth/roles'

export type Invite = typeof invites.$inferSelect

export async function createInvite(data: {
  email: string
  restaurantId: string
  role: ProfileRole
  canCreateLists: boolean
  invitedBy: string
}): Promise<Invite> {
  const [row] = await db
    .insert(invites)
    .values({
      email: data.email.toLowerCase(),
      restaurantId: data.restaurantId,
      role: data.role,
      canCreateLists: data.canCreateLists,
      invitedBy: data.invitedBy,
    })
    .returning()
  return row
}

export async function deleteInvite(id: string) {
  await db.delete(invites).where(eq(invites.id, id))
}

export async function getPendingInviteByEmail(email: string): Promise<Invite | null> {
  const rows = await db
    .select()
    .from(invites)
    .where(and(eq(invites.email, email.toLowerCase()), isNull(invites.acceptedAt)))
    .limit(1)
  return rows[0] ?? null
}

export async function markInviteAccepted(id: string) {
  await db.update(invites).set({ acceptedAt: new Date() }).where(eq(invites.id, id))
}
