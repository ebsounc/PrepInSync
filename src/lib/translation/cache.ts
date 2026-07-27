import 'server-only'
import { createHash } from 'crypto'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { db, translations } from '@/lib/db'
import { translateBatch } from '@/lib/ai'
import { getGlossaryOverrides } from '@/lib/db/queries/glossary'
import { consumeRateLimit } from '@/lib/db/queries/rate-limit'
import { translationRule } from '@/lib/rate-limits'

export type TranslatableField = {
  entityType: string
  entityId: string
  field: string
  sourceText: string
  sourceLanguage: 'en' | 'es'
}

// Exported so apply.ts builds identical keys — a divergence would turn every
// lookup into a silent cache miss.
export const keyOf = (entityType: string, entityId: string, field: string) =>
  `${entityType}:${entityId}:${field}`

const md5 = (text: string) => createHash('md5').update(text).digest('hex')

// Max fields per LLM call. Keeps each translateBatch call well under its timeout so
// large entities (a full recipe) translate reliably; chunks run in parallel.
const TRANSLATE_CHUNK_SIZE = 10

// Lazy read-through translation cache. Returns a Map keyed by
// `${entityType}:${entityId}:${field}` → the text to display in targetLanguage.
//
// Per field: same-language or empty → source text (no work). Otherwise look up
// the cached row; a matching source_hash is a hit, anything else (missing or
// stale) is translated in one batched LLM call and upserted. On LLM failure the
// field falls back to its source text and nothing is persisted, so it retries on
// the next render — the cook never sees a blank or an error.
export async function getTranslations(
  fields: TranslatableField[],
  restaurantId: string,
  targetLanguage: 'en' | 'es'
): Promise<Map<string, string>> {
  const result = new Map<string, string>()

  type Need = TranslatableField & { key: string; hash: string }
  const needs: Need[] = []
  for (const f of fields) {
    const key = keyOf(f.entityType, f.entityId, f.field)
    if (f.sourceLanguage === targetLanguage || !f.sourceText) {
      result.set(key, f.sourceText)
      continue
    }
    needs.push({ ...f, key, hash: md5(f.sourceText) })
  }
  if (needs.length === 0) return result

  // One SELECT for all needed entities in this restaurant + target language.
  const entityIds = [...new Set(needs.map((n) => n.entityId))]
  const cachedRows = await db
    .select({
      entityType: translations.entityType,
      entityId: translations.entityId,
      field: translations.field,
      translatedText: translations.translatedText,
      sourceHash: translations.sourceHash,
    })
    .from(translations)
    .where(
      and(
        eq(translations.restaurantId, restaurantId),
        eq(translations.targetLanguage, targetLanguage),
        inArray(translations.entityId, entityIds)
      )
    )
  const cached = new Map(
    cachedRows.map((r) => [keyOf(r.entityType, r.entityId, r.field), r])
  )

  const misses: Need[] = []
  for (const n of needs) {
    const hit = cached.get(n.key)
    if (hit && hit.sourceHash === n.hash) {
      result.set(n.key, hit.translatedText)
    } else {
      misses.push(n)
    }
  }
  if (misses.length === 0) return result

  // Group by source language (with two languages this is a single group, but the
  // grouping keeps the design correct when more languages are added in v2).
  const bySource = new Map<'en' | 'es', Need[]>()
  for (const m of misses) {
    const list = bySource.get(m.sourceLanguage) ?? []
    list.push(m)
    bySource.set(m.sourceLanguage, list)
  }

  const toPersist: (typeof translations.$inferInsert)[] = []
  for (const [sourceLanguage, group] of bySource) {
    const overrides = await getGlossaryOverrides(
      restaurantId,
      sourceLanguage,
      targetLanguage
    )
    // Split into chunks so a big entity (e.g. a full recipe = ingredients + steps,
    // 30+ fields) doesn't exceed translateBatch's per-call timeout and fail wholesale.
    // Chunks run in parallel and cache independently: one slow/failed chunk falls back
    // to source text on its own fields without losing the rest.
    const chunks: Need[][] = []
    for (let i = 0; i < group.length; i += TRANSLATE_CHUNK_SIZE) {
      chunks.push(group.slice(i, i + TRANSLATE_CHUNK_SIZE))
    }
    await Promise.all(
      chunks.map(async (chunkGroup) => {
        try {
          // One unit of quota per LLM call, charged per chunk since that's what
          // actually costs money. Over quota throws into the catch below, which is
          // already the "show source text, persist nothing, retry next render" path —
          // so a rate-limited cook sees untranslated text rather than an error, and it
          // heals itself when the window rolls over.
          const { allowed } = await consumeRateLimit(translationRule(restaurantId))
          if (!allowed) throw new Error('translation rate limit exceeded')

          const translated = await translateBatch({
            items: chunkGroup.map((g) => ({ id: g.key, text: g.sourceText })),
            sourceLanguage,
            targetLanguage,
            overrides,
          })
          for (const g of chunkGroup) {
            const text = translated.get(g.key)
            // translateBatch guarantees every id on success, but guard anyway: only
            // persist real translations, never a source-text fallback.
            if (text === undefined) {
              result.set(g.key, g.sourceText)
              continue
            }
            result.set(g.key, text)
            toPersist.push({
              restaurantId,
              entityType: g.entityType,
              entityId: g.entityId,
              field: g.field,
              targetLanguage,
              translatedText: text,
              sourceHash: g.hash,
            })
          }
        } catch {
          // LLM failed for this chunk — show source text, persist nothing, retry later.
          for (const g of chunkGroup) result.set(g.key, g.sourceText)
        }
      })
    )
  }

  if (toPersist.length > 0) {
    await db
      .insert(translations)
      .values(toPersist)
      .onConflictDoUpdate({
        target: [
          translations.restaurantId,
          translations.entityType,
          translations.entityId,
          translations.field,
          translations.targetLanguage,
        ],
        // restaurant_id is part of the conflict key, so it never changes here.
        set: {
          translatedText: sql`excluded.translated_text`,
          sourceHash: sql`excluded.source_hash`,
          updatedAt: sql`now()`,
        },
      })
  }

  return result
}
