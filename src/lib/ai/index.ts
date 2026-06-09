import 'server-only'
import { anthropic } from '@ai-sdk/anthropic'
import { generateObject, type SystemModelMessage } from 'ai'
import { z } from 'zod'
import { KITCHEN_GLOSSARY, formatOverrides, type GlossaryOverride } from './glossary'

export type { GlossaryOverride } from './glossary'

// Sonnet 4.6 per CLAUDE.md — kitchen-accurate translation + (later) recipe parsing.
const MODEL = 'claude-sonnet-4-6'

// Hard ceiling so a slow/hung API call can't block a server render. On timeout
// the call throws and the caller (the translation cache) falls back to source text.
const TIMEOUT_MS = 8000

export type TranslateOptions = {
  text: string
  sourceLanguage: 'en' | 'es'
  targetLanguage: 'en' | 'es'
  overrides?: GlossaryOverride[]
}

export type BatchTranslateItem = { id: string; text: string }

export type BatchTranslateInput = {
  items: BatchTranslateItem[]
  sourceLanguage: 'en' | 'es'
  targetLanguage: 'en' | 'es'
  overrides?: GlossaryOverride[]
}

const LANGUAGE_NAMES: Record<'en' | 'es', string> = { en: 'English', es: 'Spanish' }

const batchSchema = z.object({
  translations: z.array(z.object({ id: z.string(), text: z.string() })),
})

// Translate many fields in a single LLM call. Returns a Map keyed by item id.
//
// THROWS on any failure (API error, timeout, or a model response missing
// requested ids). The caller is responsible for the source-text fallback so it
// can also decide not to persist failed results — see lib/translation/cache.ts.
// When source === target it short-circuits with the input text (no API call).
export async function translateBatch(
  input: BatchTranslateInput
): Promise<Map<string, string>> {
  const { items, sourceLanguage, targetLanguage, overrides = [] } = input

  if (sourceLanguage === targetLanguage) {
    return new Map(items.map((i) => [i.id, i.text]))
  }
  if (items.length === 0) return new Map()

  // System prompt is split so the large, stable glossary is a cacheable prefix
  // (Anthropic prompt caching). The per-restaurant overrides go in a separate,
  // smaller segment that varies by restaurant.
  const system: SystemModelMessage[] = [
    {
      role: 'system',
      content:
        `You translate professional kitchen prep text from ${LANGUAGE_NAMES[sourceLanguage]} ` +
        `to ${LANGUAGE_NAMES[targetLanguage]}. Use natural language a working prep cook would ` +
        `actually use, not literal/dictionary translations. Preserve numbers, measurements, and ` +
        `proper nouns. Translate each item independently and return its exact id unchanged. ` +
        `Output only the translation text for each item — no quotes, labels, or commentary.\n\n` +
        KITCHEN_GLOSSARY,
      providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } },
    },
  ]
  const overrideBlock = formatOverrides(overrides, sourceLanguage, targetLanguage)
  if (overrideBlock) {
    system.push({ role: 'system', content: overrideBlock })
  }

  const { object } = await generateObject({
    model: anthropic(MODEL),
    schema: batchSchema,
    system,
    prompt:
      `Translate the "text" of each item below. Return one result per item with the same id.\n\n` +
      JSON.stringify(items),
    abortSignal: AbortSignal.timeout(TIMEOUT_MS),
    maxRetries: 1,
  })

  const result = new Map(object.translations.map((t) => [t.id, t.text]))
  // Structured output should echo every id; if any are missing, treat the whole
  // batch as failed so the caller falls back rather than persisting holes.
  for (const item of items) {
    if (!result.has(item.id)) {
      throw new Error(`translateBatch: model response missing id ${item.id}`)
    }
  }
  return result
}

// Single-string convenience. Unlike translateBatch this never throws — on any
// failure it returns the source text, for callers that just want best-effort
// translation inline. All LLM access still funnels through this module.
export async function translate(options: TranslateOptions): Promise<string> {
  try {
    const map = await translateBatch({
      items: [{ id: 'text', text: options.text }],
      sourceLanguage: options.sourceLanguage,
      targetLanguage: options.targetLanguage,
      overrides: options.overrides,
    })
    return map.get('text') ?? options.text
  } catch {
    return options.text
  }
}
