import 'server-only'
import { and, desc, eq } from 'drizzle-orm'
import { db, glossaryOverrides, translations } from '@/lib/db'
import type { GlossaryOverride } from '@/lib/ai/glossary'

// Every override becomes a line in the translation system prompt, so an unbounded
// fetch would let one restaurant grow its own prompt without limit — both a cost
// amplifier and a way to crowd out the real glossary. Newest wins; formatOverrides
// enforces the same ceiling again when rendering.
const MAX_GLOSSARY_OVERRIDES = 100

// Restaurant overrides for one translation direction, injected into prompts.
export async function getGlossaryOverrides(
  restaurantId: string,
  sourceLanguage: 'en' | 'es',
  targetLanguage: 'en' | 'es'
): Promise<GlossaryOverride[]> {
  const rows = await db
    .select({
      sourceTerm: glossaryOverrides.sourceTerm,
      sourceLanguage: glossaryOverrides.sourceLanguage,
      targetLanguage: glossaryOverrides.targetLanguage,
      preferredTranslation: glossaryOverrides.preferredTranslation,
    })
    .from(glossaryOverrides)
    .where(
      and(
        eq(glossaryOverrides.restaurantId, restaurantId),
        eq(glossaryOverrides.sourceLanguage, sourceLanguage),
        eq(glossaryOverrides.targetLanguage, targetLanguage)
      )
    )
    .orderBy(desc(glossaryOverrides.updatedAt))
    .limit(MAX_GLOSSARY_OVERRIDES)
  return rows
}

// A user-confirmed correction. Upserts on the unique (restaurant, term, direction)
// index so re-correcting a term replaces the prior preferred translation.
export async function createGlossaryOverride(data: {
  restaurantId: string
  sourceTerm: string
  sourceLanguage: 'en' | 'es'
  targetLanguage: 'en' | 'es'
  preferredTranslation: string
  createdBy: string
}): Promise<void> {
  await db
    .insert(glossaryOverrides)
    .values(data)
    .onConflictDoUpdate({
      target: [
        glossaryOverrides.restaurantId,
        glossaryOverrides.sourceTerm,
        glossaryOverrides.sourceLanguage,
        glossaryOverrides.targetLanguage,
      ],
      set: {
        preferredTranslation: data.preferredTranslation,
        createdBy: data.createdBy,
        updatedAt: new Date(),
      },
    })
}

// Drops a specific cached translation so it regenerates on next read. Used when
// the desired translation changes but the SOURCE text doesn't (an override) —
// source_hash staleness alone wouldn't catch that case. Scoped by restaurant.
export async function deleteTranslationsFor(
  restaurantId: string,
  entityType: string,
  entityId: string,
  field: string,
  targetLanguage: 'en' | 'es'
): Promise<void> {
  await db
    .delete(translations)
    .where(
      and(
        eq(translations.restaurantId, restaurantId),
        eq(translations.entityType, entityType),
        eq(translations.entityId, entityId),
        eq(translations.field, field),
        eq(translations.targetLanguage, targetLanguage)
      )
    )
}
