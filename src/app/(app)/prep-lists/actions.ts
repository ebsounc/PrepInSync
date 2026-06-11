'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getProfileByUserId, type Profile } from '@/lib/db/queries/profiles'
import {
  createPrepList,
  getPrepListById,
  updatePrepList,
  deletePrepList,
} from '@/lib/db/queries/prep-lists'
import { getPrepItemById } from '@/lib/db/queries/prep-items'
import {
  addEntry,
  updateEntry,
  removeEntry,
  setEntryStarred,
  toggleEntryCompletion,
  setEntryCookNote,
  getEntryAccess,
} from '@/lib/db/queries/prep-list-entries'
import { isValidUnit } from '@/lib/db/queries/restaurant-units'
import { getDictionary, resolveKey, type Dict } from '@/lib/i18n'
import { getActionDict } from '@/lib/i18n/server'

export type ListActionState = { error?: string; success?: boolean } | null

type MemberCtx = { profile: Profile; restaurantId: string; dict: Dict }

// Any active member of a restaurant (the people who work lists).
async function requireMember(): Promise<{ error: string } | MemberCtx> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: (await getActionDict()).errors.common.signInRequired }
  const profile = await getProfileByUserId(user.id)
  if (!profile || !profile.restaurantId || !profile.isActive) {
    return { error: (await getActionDict(profile?.preferredLanguage)).errors.common.noAccess }
  }
  return {
    profile,
    restaurantId: profile.restaurantId,
    dict: getDictionary(profile.preferredLanguage),
  }
}

// A member who is also allowed to build/edit lists.
async function requireBuilder(): Promise<{ error: string } | MemberCtx> {
  const ctx = await requireMember()
  if ('error' in ctx) return ctx
  if (!ctx.profile.canCreateLists) {
    return { error: ctx.dict.errors.prepLists.noPermission }
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
  title: z.string().trim().min(1, 'errors.prepLists.titleRequired').max(120),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'errors.prepLists.invalidDate'),
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
  if (!parsed.success) return { error: resolveKey(ctx.dict, parsed.error.issues[0].message) }

  const list = await createPrepList({
    restaurantId: ctx.restaurantId,
    title: parsed.data.title,
    date: parsed.data.date,
    sourceLanguage: ctx.profile.preferredLanguage,
    createdBy: ctx.profile.id,
  })
  revalidatePath('/prep-lists')
  redirect(`/prep-lists/${list.id}`)
}

export async function updateListAction(
  _prev: ListActionState,
  formData: FormData
): Promise<ListActionState> {
  const ctx = await requireBuilder()
  if ('error' in ctx) return { error: ctx.error }

  const listId = z.string().uuid().safeParse(formData.get('listId'))
  if (!listId.success) return { error: ctx.dict.errors.prepLists.invalidList }
  const list = await getPrepListById(listId.data, ctx.restaurantId)
  if (!list) return { error: ctx.dict.errors.prepLists.listNotFound }

  const parsed = createListSchema.safeParse({
    title: formData.get('title'),
    date: formData.get('date'),
  })
  if (!parsed.success) return { error: resolveKey(ctx.dict, parsed.error.issues[0].message) }

  await updatePrepList(list.id, ctx.restaurantId, {
    title: parsed.data.title,
    date: parsed.data.date,
    sourceLanguage: ctx.profile.preferredLanguage,
  })
  revalidatePath(`/prep-lists/${list.id}`)
  revalidatePath('/prep-lists')
  return { success: true }
}

const entrySchema = z.object({
  prepItemId: z.string().uuid('errors.prepLists.pickItem'),
  quantity: z
    .string()
    .trim()
    .regex(/^\d*\.?\d+$/, 'errors.prepLists.quantityNumber'),
  // Unit membership (built-in or restaurant custom) is checked in the action.
  unit: z.string().trim().min(1, 'errors.prepLists.pickUnit').max(20),
  isStarred: z.string().optional(),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
})

export async function addEntryAction(
  _prev: ListActionState,
  formData: FormData
): Promise<ListActionState> {
  const ctx = await requireBuilder()
  if ('error' in ctx) return { error: ctx.error }

  const listId = z.string().uuid().safeParse(formData.get('prepListId'))
  if (!listId.success) return { error: ctx.dict.errors.prepLists.invalidList }

  // List and item must both belong to the caller's restaurant.
  const list = await getPrepListById(listId.data, ctx.restaurantId)
  if (!list) return { error: ctx.dict.errors.prepLists.listNotFound }

  const parsed = entrySchema.safeParse({
    prepItemId: formData.get('prepItemId'),
    quantity: formData.get('quantity'),
    unit: formData.get('unit'),
    isStarred: formData.get('isStarred') ?? undefined,
    notes: formData.get('notes') ?? undefined,
  })
  if (!parsed.success) return { error: resolveKey(ctx.dict, parsed.error.issues[0].message) }
  if (!(await isValidUnit(ctx.restaurantId, parsed.data.unit))) {
    return { error: ctx.dict.errors.prepLists.invalidUnit }
  }

  const item = await getPrepItemById(parsed.data.prepItemId, ctx.restaurantId)
  if (!item) return { error: ctx.dict.errors.prepLists.itemNotFound }

  await addEntry({
    prepListId: list.id,
    prepItemId: item.id,
    quantity: parsed.data.quantity,
    unit: parsed.data.unit,
    isStarred: parsed.data.isStarred === 'true',
    notes: parsed.data.notes ? parsed.data.notes : null,
    notesSourceLanguage: ctx.profile.preferredLanguage,
  })
  revalidatePath(`/prep-lists/${list.id}`)
  return { success: true }
}

const updateEntrySchema = z.object({
  quantity: z
    .string()
    .trim()
    .regex(/^\d*\.?\d+$/, 'errors.prepLists.quantityNumber'),
  unit: z.string().trim().min(1, 'errors.prepLists.pickUnit').max(20),
  isStarred: z.string().optional(),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
})

export async function updateEntryAction(
  _prev: ListActionState,
  formData: FormData
): Promise<ListActionState> {
  const ctx = await requireBuilder()
  if ('error' in ctx) return { error: ctx.error }

  const entryId = z.string().uuid().safeParse(formData.get('entryId'))
  if (!entryId.success) return { error: ctx.dict.errors.prepLists.invalidEntry }
  const entry = await accessibleEntry(entryId.data, ctx.restaurantId)
  if (!entry) return { error: ctx.dict.errors.prepLists.entryNotFound }

  const parsed = updateEntrySchema.safeParse({
    quantity: formData.get('quantity'),
    unit: formData.get('unit'),
    isStarred: formData.get('isStarred') ?? undefined,
    notes: formData.get('notes') ?? undefined,
  })
  if (!parsed.success) return { error: resolveKey(ctx.dict, parsed.error.issues[0].message) }
  if (!(await isValidUnit(ctx.restaurantId, parsed.data.unit))) {
    return { error: ctx.dict.errors.prepLists.invalidUnit }
  }

  await updateEntry(entry.id, {
    quantity: parsed.data.quantity,
    unit: parsed.data.unit,
    isStarred: parsed.data.isStarred === 'true',
    notes: parsed.data.notes ? parsed.data.notes : null,
    notesSourceLanguage: ctx.profile.preferredLanguage,
  })
  revalidatePath(`/prep-lists/${entry.prepListId}`)
  return { success: true }
}

export async function setStarAction(entryId: string, value: boolean): Promise<{ error?: string }> {
  const ctx = await requireBuilder()
  if ('error' in ctx) return { error: ctx.error }
  const entry = await accessibleEntry(entryId, ctx.restaurantId)
  if (!entry) return { error: ctx.dict.errors.prepLists.entryNotFound }
  await setEntryStarred(entry.id, value)
  revalidatePath(`/prep-lists/${entry.prepListId}`)
  return {}
}

export async function removeEntryAction(entryId: string): Promise<{ error?: string }> {
  const ctx = await requireBuilder()
  if ('error' in ctx) return { error: ctx.error }
  const entry = await accessibleEntry(entryId, ctx.restaurantId)
  if (!entry) return { error: ctx.dict.errors.prepLists.entryNotFound }
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
  if (!list) return { error: ctx.dict.errors.prepLists.listNotFound }
  await deletePrepList(list.id, ctx.restaurantId)
  revalidatePath('/prep-lists')
  return {}
}

// --- Any-member actions: completion + notes (the core cook interactions) --------

export async function toggleCompletionAction(entryId: string): Promise<{ error?: string }> {
  const ctx = await requireMember()
  if ('error' in ctx) return { error: ctx.error }
  const entry = await accessibleEntry(entryId, ctx.restaurantId)
  if (!entry) return { error: ctx.dict.errors.prepLists.entryNotFound }
  await toggleEntryCompletion(entry.id, !entry.completed, ctx.profile.id)
  revalidatePath(`/prep-lists/${entry.prepListId}`)
  return {}
}

// The cook's own note (a separate field from the builder's prep note). Any active
// member can leave one — it's the core "we're out of cilantro" interaction.
export async function saveCookNoteAction(entryId: string, note: string): Promise<{ error?: string }> {
  const ctx = await requireMember()
  if ('error' in ctx) return { error: ctx.error }
  const entry = await accessibleEntry(entryId, ctx.restaurantId)
  if (!entry) return { error: ctx.dict.errors.prepLists.entryNotFound }
  const trimmed = note.trim().slice(0, 500)
  await setEntryCookNote(
    entry.id,
    trimmed.length ? trimmed : null,
    ctx.profile.id,
    ctx.profile.preferredLanguage
  )
  revalidatePath(`/prep-lists/${entry.prepListId}`)
  return {}
}
