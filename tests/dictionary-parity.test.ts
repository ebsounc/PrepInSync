import { describe, it, expect } from 'vitest'
import { getDictionary } from '@/lib/i18n'

// `type Dict = typeof en` already makes the build fail if `es` is missing a key, so
// these tests cover what the compiler cannot: that the Spanish side was actually
// translated rather than copy-pasted, and that no value is left blank.

const en = getDictionary('en')
const es = getDictionary('es')

type Node = Record<string, unknown>

/** Flattens a dictionary to dotted path → string. */
function flatten(node: Node, prefix = ''): Map<string, string> {
  const out = new Map<string, string>()
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'string') out.set(path, value)
    else if (value && typeof value === 'object') {
      for (const [k, v] of flatten(value as Node, path)) out.set(k, v)
    }
  }
  return out
}

const enFlat = flatten(en as unknown as Node)
const esFlat = flatten(es as unknown as Node)

// Strings that are legitimately identical in both languages. Anything identical and
// NOT listed here is almost certainly an untranslated stub, so this set is the
// tripwire: adding a new string that happens to match English forces a decision.
const IDENTICAL_BY_DESIGN = new Set<string>([
  // The product name is the product name.
  'appShell.brand',
  'auth.brand',
  'onboarding.brand',
  // Pure token templates -- there is no prose to translate.
  'dashboard.greetingName',
  // A language picker conventionally shows each language in its own name, so both
  // dictionaries list "English" and "Español".
  'languages.en',
  'languages.es',
  // Loanwords / cognates that kitchen Spanish keeps as-is.
  'roles.sous_chef',
  'items.parLabel',
  'corrections.original',
])

describe('dictionary parity', () => {
  it('has a reasonable number of strings (guards against an import going wrong)', () => {
    expect(enFlat.size).toBeGreaterThan(100)
  })

  it('has the same key set in both languages', () => {
    const onlyEn = [...enFlat.keys()].filter((k) => !esFlat.has(k))
    const onlyEs = [...esFlat.keys()].filter((k) => !enFlat.has(k))
    expect(onlyEn, 'keys present in en but missing from es').toEqual([])
    expect(onlyEs, 'keys present in es but missing from en').toEqual([])
  })

  it('has no blank value in either language', () => {
    const blankEn = [...enFlat].filter(([, v]) => v.trim() === '').map(([k]) => k)
    const blankEs = [...esFlat].filter(([, v]) => v.trim() === '').map(([k]) => k)
    expect(blankEn, 'blank English strings').toEqual([])
    expect(blankEs, 'blank Spanish strings').toEqual([])
  })

  it('preserves every {token} across the translation', () => {
    // A dropped token renders a literal gap in the Spanish UI; an added one renders
    // a stray "{name}" because interpolate() only replaces what the caller passes.
    const tokensOf = (s: string) => (s.match(/\{(\w+)\}/g) ?? []).sort()
    const mismatched: string[] = []
    for (const [key, enValue] of enFlat) {
      const esValue = esFlat.get(key)
      if (esValue === undefined) continue
      const a = tokensOf(enValue)
      const b = tokensOf(esValue)
      if (a.join(',') !== b.join(',')) {
        mismatched.push(`${key}: en[${a.join(' ')}] vs es[${b.join(' ')}]`)
      }
    }
    expect(mismatched, 'token mismatch between en and es').toEqual([])
  })

  it('has no Spanish value left identical to its English counterpart', () => {
    const identical: string[] = []
    for (const [key, enValue] of enFlat) {
      if (IDENTICAL_BY_DESIGN.has(key)) continue
      const esValue = esFlat.get(key)
      if (esValue === undefined) continue
      // Single-token strings ("{n}", "PrepInSync") and pure punctuation are fine.
      if (/^[\W\d]*$/.test(enValue)) continue
      if (enValue === esValue) identical.push(`${key}: "${enValue}"`)
    }
    expect(
      identical,
      'these Spanish strings are byte-identical to English — either translate them or add the key to IDENTICAL_BY_DESIGN'
    ).toEqual([])
  })
})
