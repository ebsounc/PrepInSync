'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getProfileByUserId } from '@/lib/db/queries/profiles'
import {
  createGlossaryOverride,
  deleteTranslationsFor,
} from '@/lib/db/queries/glossary'

// Fields a member can correct the translation of. Keep in sync with the entity
// types used by the translation cache.
const overrideSchema = z.object({
  entityType: z.enum(['prep_item', 'prep_list', 'prep_list_entry', 'restaurant_unit']),
  entityId: z.string().uuid(),
  field: z.string().trim().min(1).max(40),
  sourceText: z.string().trim().min(1).max(500),
  sourceLanguage: z.enum(['en', 'es']),
  targetLanguage: z.enum(['en', 'es']),
  preferredTranslation: z.string().trim().min(1, 'Enter a translation').max(500),
})

// Any active member can correct a translation. The correction is stored as a
// restaurant glossary override (so future translations honor it) and the cached
// translation for this field is dropped so it regenerates with the override
// applied. Deliberate action — surfaced via a non-prominent affordance in the UI.
export async function submitTranslationOverrideAction(input: {
  entityType: string
  entityId: string
  field: string
  sourceText: string
  sourceLanguage: 'en' | 'es'
  targetLanguage: 'en' | 'es'
  preferredTranslation: string
}): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in.' }

  const profile = await getProfileByUserId(user.id)
  if (!profile?.restaurantId || !profile.isActive) {
    return { error: 'You do not have access.' }
  }

  const parsed = overrideSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const d = parsed.data
  if (d.sourceLanguage === d.targetLanguage) {
    return { error: 'Nothing to translate.' }
  }

  await createGlossaryOverride({
    restaurantId: profile.restaurantId,
    sourceTerm: d.sourceText,
    sourceLanguage: d.sourceLanguage,
    targetLanguage: d.targetLanguage,
    preferredTranslation: d.preferredTranslation,
    createdBy: profile.id,
  })
  // Source text is unchanged, so source_hash staleness won't catch this — drop the
  // cached row explicitly so it regenerates honoring the new override.
  await deleteTranslationsFor(
    profile.restaurantId,
    d.entityType,
    d.entityId,
    d.field,
    d.targetLanguage
  )

  revalidatePath('/', 'layout')
  return { success: true }
}
