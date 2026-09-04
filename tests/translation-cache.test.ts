import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createHash } from 'node:crypto'

// The lazy read-through translation cache. Same mocking posture as rate-limit.test.ts:
// lib/db opens a pool at import, and the assertions are about behavior rather than SQL.

const selectChain = { from: vi.fn(), where: vi.fn() }
const insertChain = { values: vi.fn(), onConflictDoUpdate: vi.fn() }

const db = {
  select: vi.fn(() => selectChain),
  insert: vi.fn(() => insertChain),
}

const translateBatch = vi.fn()
const getGlossaryOverrides = vi.fn()
const consumeRateLimit = vi.fn()

vi.mock('@/lib/db', () => ({
  db,
  translations: {
    restaurantId: 'restaurant_id',
    entityType: 'entity_type',
    entityId: 'entity_id',
    field: 'field',
    targetLanguage: 'target_language',
    translatedText: 'translated_text',
    sourceHash: 'source_hash',
    updatedAt: 'updated_at',
  },
}))

vi.mock('@/lib/ai', () => ({ translateBatch }))
vi.mock('@/lib/db/queries/glossary', () => ({ getGlossaryOverrides }))
vi.mock('@/lib/db/queries/rate-limit', () => ({ consumeRateLimit }))

vi.mock('drizzle-orm', () => ({
  and: (...args: unknown[]) => ({ op: 'and', args }),
  eq: (...args: unknown[]) => ({ op: 'eq', args }),
  inArray: (...args: unknown[]) => ({ op: 'inArray', args }),
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
}))

const { getTranslations, keyOf } = await import('@/lib/translation/cache')

const RESTAURANT = 'restaurant-1'
const md5 = (text: string) => createHash('md5').update(text).digest('hex')

type CachedRow = {
  entityType: string
  entityId: string
  field: string
  translatedText: string
  sourceHash: string
}

/** Seeds the rows the cache SELECT will return. */
const seedCache = (rows: CachedRow[]) => selectChain.where.mockResolvedValue(rows)

const field = (partial: Partial<Parameters<typeof getTranslations>[0][number]> = {}) => ({
  entityType: 'prep_item',
  entityId: 'item-1',
  field: 'name',
  sourceText: 'Yellow onion',
  sourceLanguage: 'en' as const,
  ...partial,
})

/** What db.insert(...).values(...) was called with, flattened. */
const persisted = () =>
  insertChain.values.mock.calls.flatMap((call) => call[0] as Record<string, unknown>[])

beforeEach(() => {
  vi.clearAllMocks()
  selectChain.from.mockReturnValue(selectChain)
  selectChain.where.mockResolvedValue([])
  insertChain.values.mockReturnValue(insertChain)
  insertChain.onConflictDoUpdate.mockResolvedValue(undefined)
  getGlossaryOverrides.mockResolvedValue([])
  consumeRateLimit.mockResolvedValue({ allowed: true, retryAfterMs: 0 })
  translateBatch.mockImplementation(
    async ({ items }: { items: { id: string; text: string }[] }) =>
      new Map(items.map((i) => [i.id, `ES:${i.text}`]))
  )
})

describe('work the cache can skip entirely', () => {
  it('returns source text without any work when the languages match', () => {
    // A cook reading in the language content was authored in should cost nothing.
    return getTranslations([field()], RESTAURANT, 'en').then((result) => {
      expect(result.get(keyOf('prep_item', 'item-1', 'name'))).toBe('Yellow onion')
      expect(db.select).not.toHaveBeenCalled()
      expect(translateBatch).not.toHaveBeenCalled()
    })
  })

  it('returns empty source text untouched', async () => {
    const result = await getTranslations([field({ sourceText: '' })], RESTAURANT, 'es')
    expect(result.get(keyOf('prep_item', 'item-1', 'name'))).toBe('')
    expect(translateBatch).not.toHaveBeenCalled()
  })

  it('does nothing at all for an empty field list', async () => {
    const result = await getTranslations([], RESTAURANT, 'es')
    expect(result.size).toBe(0)
    expect(db.select).not.toHaveBeenCalled()
  })
})

describe('cache hits and hash-based invalidation', () => {
  it('serves a cached row whose source hash still matches', async () => {
    seedCache([
      {
        entityType: 'prep_item',
        entityId: 'item-1',
        field: 'name',
        translatedText: 'Cebolla amarilla',
        sourceHash: md5('Yellow onion'),
      },
    ])

    const result = await getTranslations([field()], RESTAURANT, 'es')
    expect(result.get(keyOf('prep_item', 'item-1', 'name'))).toBe('Cebolla amarilla')
    expect(translateBatch).not.toHaveBeenCalled()
    expect(db.insert).not.toHaveBeenCalled()
  })

  it('re-translates when the source text has changed under a cached row', async () => {
    // This is the invalidation mechanism: the stored hash no longer matches the source,
    // so the row is stale and regenerates. No explicit delete-on-edit bookkeeping.
    seedCache([
      {
        entityType: 'prep_item',
        entityId: 'item-1',
        field: 'name',
        translatedText: 'Cebolla amarilla',
        sourceHash: md5('Yellow onion'),
      },
    ])

    const result = await getTranslations(
      [field({ sourceText: 'Red onion' })],
      RESTAURANT,
      'es'
    )
    expect(result.get(keyOf('prep_item', 'item-1', 'name'))).toBe('ES:Red onion')
    expect(translateBatch).toHaveBeenCalledOnce()
  })

  it('re-translates only the stale field and leaves fresh ones alone', async () => {
    seedCache([
      {
        entityType: 'prep_item',
        entityId: 'item-1',
        field: 'name',
        translatedText: 'Cebolla amarilla',
        sourceHash: md5('Yellow onion'),
      },
      {
        entityType: 'prep_item',
        entityId: 'item-1',
        field: 'description',
        translatedText: 'texto viejo',
        sourceHash: md5('Old description'),
      },
    ])

    const result = await getTranslations(
      [
        field(),
        field({ field: 'description', sourceText: 'New description' }),
      ],
      RESTAURANT,
      'es'
    )

    expect(result.get(keyOf('prep_item', 'item-1', 'name'))).toBe('Cebolla amarilla')
    expect(result.get(keyOf('prep_item', 'item-1', 'description'))).toBe('ES:New description')

    const sent = translateBatch.mock.calls[0][0].items as { id: string; text: string }[]
    expect(sent).toHaveLength(1)
    expect(sent[0].text).toBe('New description')
  })

  it('translates a field with no cached row at all', async () => {
    seedCache([])
    const result = await getTranslations([field()], RESTAURANT, 'es')
    expect(result.get(keyOf('prep_item', 'item-1', 'name'))).toBe('ES:Yellow onion')
  })

  it('stores the new translation with the hash of the text it was made from', async () => {
    seedCache([])
    await getTranslations([field()], RESTAURANT, 'es')

    expect(persisted()).toEqual([
      {
        restaurantId: RESTAURANT,
        entityType: 'prep_item',
        entityId: 'item-1',
        field: 'name',
        targetLanguage: 'es',
        translatedText: 'ES:Yellow onion',
        sourceHash: md5('Yellow onion'),
      },
    ])
    expect(insertChain.onConflictDoUpdate).toHaveBeenCalledOnce()
  })
})

describe('batching and chunking', () => {
  it('reads the whole page in one SELECT', async () => {
    seedCache([])
    await getTranslations(
      [
        field({ entityId: 'item-1' }),
        field({ entityId: 'item-2' }),
        field({ entityId: 'item-3' }),
      ],
      RESTAURANT,
      'es'
    )
    expect(db.select).toHaveBeenCalledOnce()
  })

  it('translates a small page in a single LLM call', async () => {
    seedCache([])
    await getTranslations(
      [field({ entityId: 'item-1' }), field({ entityId: 'item-2' })],
      RESTAURANT,
      'es'
    )
    expect(translateBatch).toHaveBeenCalledOnce()
    expect(translateBatch.mock.calls[0][0].items).toHaveLength(2)
  })

  it('splits a large entity into parallel chunks of at most ten fields', async () => {
    // A full recipe is 30+ fields; one oversized call would risk the whole entity
    // timing out and falling back wholesale.
    seedCache([])
    const fields = Array.from({ length: 25 }, (_, i) =>
      field({ entityId: 'recipe-1', field: `step:${i}:text`, sourceText: `Step ${i}` })
    )

    await getTranslations(fields, RESTAURANT, 'es')

    expect(translateBatch).toHaveBeenCalledTimes(3)
    const sizes = translateBatch.mock.calls
      .map((c) => (c[0].items as unknown[]).length)
      .sort((a, b) => b - a)
    expect(sizes).toEqual([10, 10, 5])
    for (const size of sizes) expect(size).toBeLessThanOrEqual(10)
  })

  it('charges one unit of quota per chunk, since that is what costs money', async () => {
    seedCache([])
    const fields = Array.from({ length: 25 }, (_, i) =>
      field({ entityId: 'recipe-1', field: `step:${i}:text`, sourceText: `Step ${i}` })
    )
    await getTranslations(fields, RESTAURANT, 'es')
    expect(consumeRateLimit).toHaveBeenCalledTimes(3)
  })

  it('groups by source language so mixed-language content stays correct', async () => {
    seedCache([])
    await getTranslations(
      [
        field({ entityId: 'item-1', sourceText: 'Yellow onion', sourceLanguage: 'en' }),
        field({ entityId: 'item-2', sourceText: 'Cebolla', sourceLanguage: 'es' }),
      ],
      RESTAURANT,
      'en'
    )

    // Only the Spanish-authored item needs work when the viewer reads English.
    expect(translateBatch).toHaveBeenCalledOnce()
    const call = translateBatch.mock.calls[0][0]
    expect(call.sourceLanguage).toBe('es')
    expect(call.targetLanguage).toBe('en')
    expect(call.items).toHaveLength(1)
  })
})

describe('graceful degradation', () => {
  it('falls back to source text and persists nothing when the LLM fails', async () => {
    // A cook must never see a blank or an error. Persisting nothing means the next
    // render retries, so the failure heals itself.
    seedCache([])
    translateBatch.mockRejectedValue(new Error('upstream 529'))

    const result = await getTranslations(
      [field(), field({ field: 'description', sourceText: 'In the walk-in' })],
      RESTAURANT,
      'es'
    )

    expect(result.get(keyOf('prep_item', 'item-1', 'name'))).toBe('Yellow onion')
    expect(result.get(keyOf('prep_item', 'item-1', 'description'))).toBe('In the walk-in')
    expect(db.insert).not.toHaveBeenCalled()
  })

  it('degrades the same way when the translation rate limit is exhausted', async () => {
    // Rate-limited translation reuses the LLM-failure path on purpose: untranslated
    // text rather than an error, nothing cached, and it recovers when the window rolls.
    seedCache([])
    consumeRateLimit.mockResolvedValue({ allowed: false, retryAfterMs: 60_000 })

    const result = await getTranslations([field()], RESTAURANT, 'es')

    expect(result.get(keyOf('prep_item', 'item-1', 'name'))).toBe('Yellow onion')
    expect(translateBatch).not.toHaveBeenCalled()
    expect(db.insert).not.toHaveBeenCalled()
  })

  it('loses only the failing chunk, not the whole page', async () => {
    seedCache([])
    const fields = Array.from({ length: 25 }, (_, i) =>
      field({ entityId: 'recipe-1', field: `step:${i}:text`, sourceText: `Step ${i}` })
    )
    // Fail whichever chunk arrives second; the other two must still land.
    let call = 0
    translateBatch.mockImplementation(
      async ({ items }: { items: { id: string; text: string }[] }) => {
        call += 1
        if (call === 2) throw new Error('chunk timeout')
        return new Map(items.map((i) => [i.id, `ES:${i.text}`]))
      }
    )

    const result = await getTranslations(fields, RESTAURANT, 'es')

    const translated = [...result.values()].filter((v) => v.startsWith('ES:'))
    const fellBack = [...result.values()].filter((v) => v.startsWith('Step '))
    expect(translated.length + fellBack.length).toBe(25)
    expect(fellBack.length).toBeGreaterThan(0)
    expect(translated.length).toBeGreaterThan(0)
    // Only the successful chunks were cached.
    expect(persisted()).toHaveLength(translated.length)
  })

  it('falls back for an id the LLM response omitted, and does not cache it', async () => {
    seedCache([])
    translateBatch.mockImplementation(
      async ({ items }: { items: { id: string; text: string }[] }) =>
        // Drop the second item from the response.
        new Map(items.slice(0, 1).map((i) => [i.id, `ES:${i.text}`]))
    )

    const result = await getTranslations(
      [
        field({ entityId: 'item-1', sourceText: 'Yellow onion' }),
        field({ entityId: 'item-2', sourceText: 'Cilantro' }),
      ],
      RESTAURANT,
      'es'
    )

    expect(result.get(keyOf('prep_item', 'item-1', 'name'))).toBe('ES:Yellow onion')
    expect(result.get(keyOf('prep_item', 'item-2', 'name'))).toBe('Cilantro')
    expect(persisted()).toHaveLength(1)
  })

  it('skips the insert entirely when there is nothing new to persist', async () => {
    seedCache([
      {
        entityType: 'prep_item',
        entityId: 'item-1',
        field: 'name',
        translatedText: 'Cebolla amarilla',
        sourceHash: md5('Yellow onion'),
      },
    ])
    await getTranslations([field()], RESTAURANT, 'es')
    expect(db.insert).not.toHaveBeenCalled()
  })
})

describe('tenant isolation and glossary wiring', () => {
  it('scopes the cache read and write to the calling restaurant', async () => {
    seedCache([])
    await getTranslations([field()], RESTAURANT, 'es')
    expect(persisted()[0].restaurantId).toBe(RESTAURANT)
    expect(getGlossaryOverrides).toHaveBeenCalledWith(RESTAURANT, 'en', 'es')
  })

  it('passes the per-restaurant glossary overrides into the translation call', async () => {
    seedCache([])
    const overrides = [
      {
        sourceTerm: 'sheet pan',
        sourceLanguage: 'en' as const,
        targetLanguage: 'es' as const,
        preferredTranslation: 'charola',
      },
    ]
    getGlossaryOverrides.mockResolvedValue(overrides)

    await getTranslations([field()], RESTAURANT, 'es')
    expect(translateBatch.mock.calls[0][0].overrides).toEqual(overrides)
  })
})

describe('keyOf', () => {
  it('builds the composite key the whole cache is addressed by', () => {
    // apply.ts builds the same keys independently; a divergence would turn every
    // lookup into a silent cache miss.
    expect(keyOf('prep_item', 'item-1', 'name')).toBe('prep_item:item-1:name')
    expect(keyOf('recipe', 'r1', 'ingredient:0:name')).toBe('recipe:r1:ingredient:0:name')
  })

  it('keeps distinct fields and entities distinct', () => {
    expect(keyOf('prep_item', 'a', 'name')).not.toBe(keyOf('prep_item', 'a', 'description'))
    expect(keyOf('prep_item', 'a', 'name')).not.toBe(keyOf('prep_item', 'b', 'name'))
    expect(keyOf('prep_item', 'a', 'name')).not.toBe(keyOf('prep_list', 'a', 'name'))
  })
})
