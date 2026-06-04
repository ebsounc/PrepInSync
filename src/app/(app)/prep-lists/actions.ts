'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getProfileByUserId, type Profile } from '@/lib/db/queries/profiles'
import { createPrepList, getPrepListById, deletePrepList } from '@/lib/db/queries/prep-lists'
import { getPrepItemById } from '@/lib/db/queries/prep-items'
import {
  addEntry,
  updateEntry,
  removeEntry,
  setEntryStarred,
  toggleEntryCompletion,
  setEntryNote,
  getEntryAccess,
} from '@/lib/db/queries/prep-list-entries'
import { UNIT_VALUES } from '@/lib/units'

export type ListActionState = { error?: string; success?: boolean } | null

// Any active member of a restaurant (the people who work lists).
async function requireMember(): Promise<{ error: string } | { profile: Profile; restaurantId: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in.' }
  const profile = await getProfileByUserId(user.id)
  if (!profile || !profile.restaurantId || !profile.isActive) {
    return { error: 'You do not have access.' }
  }
  return { profile, restaurantId: profile.restaurantId }
}

// A member who is also allowed to build/edit lists.
async function requireBuilder(): Promise<{ error: string } | { profile: Profile; restaurantId: string }> {
  const ctx = await requireMember()
  if ('error' in ctx) return ctx
  if (!ctx.profile.canCreateLists) {
    return { error: 'You do not have permission to edit prep lists.' }
  }
  return ctx
}

// Resolves an entry and confirms it belongs to the caller's restaurant.
async function accessibleEntry(entryId: string, restaurantId: string) {
  const entry = await getEntryAccess(entryId)
  if (!entry || entry.restaurantId !== restaurantId) return null
  return entry
}

const createListSchema = z.object({
  title: z.string().trim().min(1, 'Give the list a title').max(120),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a valid date'),
})

export async function createListAction(
  _prev: ListActionState,
  formData: FormData
): Promise<ListActionState> {
  const ctx = await requireBuilder()
  if ('error' in ctx) return { error: ctx.error }

  const parsed = createListSchema.safeParse({
    title: formData.get('title'),
    date: formData.get('date'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const list = await createPrepList({
    restaurantId: ctx.restaurantId,
    title: parsed.data.title,
    date: parsed.data.date,
    createdBy: ctx.profile.id,
  })
  revalidatePath('/prep-lists')
  redirect(`/prep-lists/${list.id}`)
}

const entrySchema = z.object({
  prepItemId: z.string().uuid('Pick an item'),
  quantity: z
    .string()
    .trim()
    .regex(/^\d*\.?\d+$/, 'Quantity must be a number'),
  unit: z.enum(UNIT_VALUES, { message: 'Pick a unit' }),
  isStarred: z.string().optional(),
})

export async function addEntryAction(
  _prev: ListActionState,
  formData: FormData
): Promise<ListActionState> {
  const ctx = await requireBuilder()
  if ('error' in ctx) return { error: ctx.error }

  const listId = z.string().uuid().safeParse(formData.get('prepListId'))
  if (!listId.success) return { error: 'Invalid list.' }

  // List and item must both belong to the caller's restaurant.
  const list = await getPrepListById(listId.data, ctx.restaurantId)
  if (!list) return { error: 'List not found.' }

  const parsed = entrySchema.safeParse({
    prepItemId: formData.get('prepItemId'),
    quantity: formData.get('quantity'),
    unit: formData.get('unit'),
    isStarred: formData.get('isStarred') ?? undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const item = await getPrepItemById(parsed.data.prepItemId, ctx.restaurantId)
  if (!item) return { error: 'Item not found.' }

  await addEntry({
    prepListId: list.id,
    prepItemId: item.id,
    quantity: parsed.data.quantity,
    unit: parsed.data.unit,
    isStarred: parsed.data.isStarred === 'true',
  })
  revalidatePath(`/prep-lists/${list.id}`)
  return { success: true }
}

const updateEntrySchema = z.object({
  quantity: z
    .string()
    .trim()
    .regex(/^\d*\.?\d+$/, 'Quantity must be a number'),
  unit: z.enum(UNIT_VALUES, { message: 'Pick a unit' }),
  isStarred: z.string().optional(),
})

export async function updateEntryAction(
  _prev: ListActionState,
  formData: FormData
): Promise<ListActionState> {
  const ctx = await requireBuilder()
  if ('error' in ctx) return { error: ctx.error }

  const entryId = z.string().uuid().safeParse(formData.get('entryId'))
  if (!entryId.success) return { error: 'Invalid entry.' }
  const entry = await accessibleEntry(entryId.data, ctx.restaurantId)
  if (!entry) return { error: 'Entry not found.' }

  const parsed = updateEntrySchema.safeParse({
    quantity: formData.get('quantity'),
    unit: formData.get('unit'),
    isStarred: formData.get('isStarred') ?? undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  await updateEntry(entry.id, {
    quantity: parsed.data.quantity,
    unit: parsed.data.unit,
    isStarred: parsed.data.isStarred === 'true',
  })
  revalidatePath(`/prep-lists/${entry.prepListId}`)
  return { success: true }
}

export async function setStarAction(entryId: string, value: boolean): Promise<{ error?: string }> {
  const ctx = await requireBuilder()
  if ('error' in ctx) return { error: ctx.error }
  const entry = await accessibleEntry(entryId, ctx.restaurantId)
  if (!entry) return { error: 'Entry not found.' }
  await setEntryStarred(entry.id, value)
  revalidatePath(`/prep-lists/${entry.prepListId}`)
  return {}
}

export async function removeEntryAction(entryId: string): Promise<{ error?: string }> {
  const ctx = await requireBuilder()
  if ('error' in ctx) return { error: ctx.error }
  const entry = await accessibleEntry(entryId, ctx.restaurantId)
  if (!entry) return { error: 'Entry not found.' }
  await removeEntry(entry.id)
  revalidatePath(`/prep-lists/${entry.prepListId}`)
  return {}
}

// Returns on success; the client navigates away (redirecting from an imperatively
// invoked action inside a transition is fragile — let the caller route).
export async function deleteListAction(listId: string): Promise<{ error?: string }> {
  const ctx = await requireBuilder()
  if ('error' in ctx) return { error: ctx.error }
  const list = await getPrepListById(listId, ctx.restaurantId)
  if (!list) return { error: 'List not found.' }
  await deletePrepList(list.id, ctx.restaurantId)
  revalidatePath('/prep-lists')
  return {}
}

// --- Any-member actions: completion + notes (the core cook interactions) --------

export async function toggleCompletionAction(entryId: string): Promise<{ error?: string }> {
  const ctx = await requireMember()
  if ('error' in ctx) return { error: ctx.error }
  const entry = await accessibleEntry(entryId, ctx.restaurantId)
  if (!entry) return { error: 'Entry not found.' }
  await toggleEntryCompletion(entry.id, !entry.completed, ctx.profile.id)
  revalidatePath(`/prep-lists/${entry.prepListId}`)
  return {}
}

export async function saveNoteAction(entryId: string, note: string): Promise<{ error?: string }> {
  const ctx = await requireMember()
  if ('error' in ctx) return { error: ctx.error }
  const entry = await accessibleEntry(entryId, ctx.restaurantId)
  if (!entry) return { error: 'Entry not found.' }
  const trimmed = note.trim().slice(0, 500)
  await setEntryNote(entry.id, trimmed.length ? trimmed : null)
  revalidatePath(`/prep-lists/${entry.prepListId}`)
  return {}
}
