import { describe, it, expect } from 'vitest'
import { getDictionary, asLang, resolveKey, interpolate } from '@/lib/i18n'

const en = getDictionary('en')

describe('asLang', () => {
  it('passes through the two supported languages', () => {
    expect(asLang('en')).toBe('en')
    expect(asLang('es')).toBe('es')
  })

  it('falls back to English for anything else', () => {
    // The input is a cookie value, so it is entirely untrusted.
    expect(asLang(undefined)).toBe('en')
    expect(asLang(null)).toBe('en')
    expect(asLang('')).toBe('en')
    expect(asLang('fr')).toBe('en')
    expect(asLang('ES')).toBe('en')
    expect(asLang('es-MX')).toBe('en')
  })
})

describe('resolveKey', () => {
  it('resolves a dotted path to its string', () => {
    // Zod messages carry these keys in their message slot; the action resolves them
    // on the way out so the cook sees the message in their own language.
    expect(resolveKey(en, 'errors.items.nameRequired')).toBe(en.errors.items.nameRequired)
    expect(resolveKey(en, 'errors.validation.required')).toBe(en.errors.validation.required)
  })

  it('returns the path itself when the key does not exist', () => {
    // A visible tell in the UI beats a blank string or a crash.
    expect(resolveKey(en, 'errors.items.doesNotExist')).toBe('errors.items.doesNotExist')
    expect(resolveKey(en, 'nope')).toBe('nope')
    expect(resolveKey(en, 'errors.nope.deeper')).toBe('errors.nope.deeper')
  })

  it('returns the path when the key resolves to a non-string node', () => {
    expect(resolveKey(en, 'errors')).toBe('errors')
    expect(resolveKey(en, 'errors.items')).toBe('errors.items')
  })

  it('does not resolve into inherited object properties', () => {
    // `part in node` would be true for prototype members; the final string check
    // is what stops them being returned as UI text.
    expect(resolveKey(en, 'constructor')).toBe('constructor')
    expect(resolveKey(en, 'toString')).toBe('toString')
    expect(resolveKey(en, '__proto__')).toBe('__proto__')
  })

  it('returns the path for an empty key', () => {
    expect(resolveKey(en, '')).toBe('')
  })
})

describe('interpolate', () => {
  it('substitutes named tokens', () => {
    expect(interpolate('Step {n}', { n: 3 })).toBe('Step 3')
    expect(interpolate('{a} and {b}', { a: 'x', b: 'y' })).toBe('x and y')
  })

  it('substitutes a repeated token everywhere it appears', () => {
    expect(interpolate('{n} of {n}', { n: 2 })).toBe('2 of 2')
  })

  it('leaves the template alone when no params are given', () => {
    expect(interpolate('Step {n}')).toBe('Step {n}')
  })

  it('leaves an unknown token visible rather than blanking it', () => {
    expect(interpolate('Step {n}', {})).toBe('Step {n}')
    expect(interpolate('{a} {b}', { a: 'x' })).toBe('x {b}')
  })

  it('stringifies numbers, including zero', () => {
    expect(interpolate('{n} done', { n: 0 })).toBe('0 done')
  })

  it('ignores text that is not a well-formed token', () => {
    expect(interpolate('{ n }', { n: 1 })).toBe('{ n }')
    expect(interpolate('{a-b}', { 'a-b': 1 })).toBe('{a-b}')
    expect(interpolate('no tokens here', { n: 1 })).toBe('no tokens here')
  })
})
