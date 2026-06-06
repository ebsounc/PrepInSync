import 'server-only'
import { eq } from 'drizzle-orm'
import { db, prepListEntries, prepLists } from '@/lib/db'

export type PrepListEntry = typeof prepListEntries.$inferSelect

// Resolves an entry to its owning restaurant (entry → list → restaurant) so actions
// can verify tenant ownership before mutating. Returns null if the entry is missing.
export async function getEntryAccess(
  id: string
): Promise<{ id: string; prepListId: string; restaurantId: string; completed: boolean } | null> {
  const rows = await db
    .select({
      id: prepListEntries.id,
      prepListId: prepListEntries.prepListId,
      restaurantId: prepLists.restaurantId,
      completed: prepListEntries.completed,
    })
    .from(prepListEntries)
    .innerJoin(prepLists, eq(prepLists.id, prepListEntries.prepListId))
    .where(eq(prepListEntries.id, id))
    .limit(1)
  return rows[0] ?? null
}

// INVARIANT: the mutations below take a bare entry id and do NOT re-check tenant
// ownership. Callers (the server actions) MUST authorize first via getEntryAccess
// (or getPrepListById for addEntry) before passing an id here — same convention as
// the other query modules (e.g. invites). Don't call these from an unguarded path.
export async function addEntry(data: {
  prepListId: string
  prepItemId: string
  quantity: string
  unit: string
  isStarred: boolean
  notes: string | null
}): Promise<PrepListEntry> {
  const [row] = await db
    .insert(prepListEntries)
    .values({
      prepListId: data.prepListId,
      prepItemId: data.prepItemId,
      quantity: data.quantity,
      unit: data.unit,
      isStarred: data.isStarred,
      notes: data.notes,
    })
    .returning()
  return row
}

export async function updateEntry(
  id: string,
  data: { quantity: string; unit: string; isStarred: boolean; notes: string | null }
) {
  await db
    .update(prepListEntries)
    .set({
      quantity: data.quantity,
      unit: data.unit,
      isStarred: data.isStarred,
      notes: data.notes,
    })
    .where(eq(prepListEntries.id, id))
}

export async function setEntryStarred(id: string, isStarred: boolean) {
  await db.update(prepListEntries).set({ isStarred }).where(eq(prepListEntries.id, id))
}

export async function removeEntry(id: string) {
  await db.delete(prepListEntries).where(eq(prepListEntries.id, id))
}

// Flips completion, stamping who/when on complete and clearing them on un-complete.
export async function toggleEntryCompletion(id: string, completed: boolean, userId: string) {
  await db
    .update(prepListEntries)
    .set({
      completed,
      completedAt: completed ? new Date() : null,
      completedBy: completed ? userId : null,
    })
    .where(eq(prepListEntries.id, id))
}

// The cook's own note (separate from the builder's prep note in `notes`). Records
// who wrote it so the UI can attribute it; clears the author when the note is removed.
export async function setEntryCookNote(id: string, note: string | null, userId: string) {
  await db
    .update(prepListEntries)
    .set({ cookNote: note, cookNoteBy: note ? userId : null })
    .where(eq(prepListEntries.id, id))
}
