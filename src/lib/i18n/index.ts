import { en, type Dict } from './en'
import { es } from './es'

export type Lang = 'en' | 'es'
export type { Dict }
export { interpolate } from './interpolate'

const DICTS: Record<Lang, Dict> = { en, es }

// The dictionary for a language. Server components, server actions, and format
// helpers call this directly; client components receive the resolved dict via the
// LanguageProvider in ./client (so neither dictionary enters the client bundle).
export function getDictionary(lang: Lang): Dict {
  return DICTS[lang]
}

// Coerces an arbitrary string (e.g. a cookie value) to a valid Lang, default 'en'.
export function asLang(value: string | undefined | null): Lang {
  return value === 'es' ? 'es' : 'en'
}

// Resolves a dotted key path (e.g. 'errors.items.nameRequired') against a dict.
// Used to translate Zod validation messages, which carry the key in their message
// slot. Returns the key itself if unresolved (an obvious tell that a key is missing).
export function resolveKey(dict: Dict, path: string): string {
  const parts = path.split('.')
  let node: unknown = dict
  for (const part of parts) {
    if (node && typeof node === 'object' && part in node) {
      node = (node as Record<string, unknown>)[part]
    } else {
      return path
    }
  }
  return typeof node === 'string' ? node : path
}
