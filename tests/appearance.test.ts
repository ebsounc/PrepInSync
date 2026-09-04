import { describe, it, expect } from 'vitest'
import { isValidAccent, ACCENTS, THEMES } from '@/lib/appearance'

// The accent value is rendered server-side into a `style` attribute and its cookie is
// user-editable, so isValidAccent is a CSS-injection guard, not a formatting nicety.
// The allow-list posture is the point: anything not a known preset or a plain hex is out.

describe('isValidAccent', () => {
  it('accepts the absent value as the baked-in default', () => {
    expect(isValidAccent(null)).toBe(true)
    expect(isValidAccent(undefined)).toBe(true)
    expect(isValidAccent('')).toBe(true)
  })

  it('accepts every preset the UI offers', () => {
    for (const accent of ACCENTS) {
      // The green default is `null` (clears the override) and is covered above.
      if (accent.value === null) continue
      expect(isValidAccent(accent.value), `preset "${accent.key}" rejected`).toBe(true)
    }
  })

  it('accepts a 6-digit hex in either case', () => {
    expect(isValidAccent('#4b9cd3')).toBe(true)
    expect(isValidAccent('#4B9CD3')).toBe(true)
    expect(isValidAccent('#000000')).toBe(true)
    expect(isValidAccent('#ffffff')).toBe(true)
  })

  it('rejects an arbitrary oklch that is not a known preset', () => {
    // This is the crux: oklch() is only allowed as an exact preset string. Accepting
    // arbitrary oklch would mean accepting arbitrary text into a style attribute.
    expect(isValidAccent('oklch(0.5 0.5 0)')).toBe(false)
    expect(isValidAccent('oklch(0.62 0.11 191)')).toBe(false)
  })

  it('rejects hex shorthand and malformed hex', () => {
    expect(isValidAccent('#abc')).toBe(false)
    expect(isValidAccent('#abcd')).toBe(false)
    expect(isValidAccent('#abcde')).toBe(false)
    expect(isValidAccent('#abcdefa')).toBe(false)
    expect(isValidAccent('#abcdeg')).toBe(false)
    expect(isValidAccent('abcdef')).toBe(false)
  })

  it('rejects CSS keywords and functions', () => {
    expect(isValidAccent('red')).toBe(false)
    expect(isValidAccent('transparent')).toBe(false)
    expect(isValidAccent('inherit')).toBe(false)
    expect(isValidAccent('var(--primary)')).toBe(false)
    expect(isValidAccent('rgb(1,2,3)')).toBe(false)
  })

  it('rejects style-attribute breakout attempts', () => {
    expect(isValidAccent('#abcdef; background: url(https://evil.test/x)')).toBe(false)
    expect(isValidAccent('red; }')).toBe(false)
    expect(isValidAccent('oklch(0.62 0.11 190); }')).toBe(false)
    expect(isValidAccent('} body { display: none')).toBe(false)
    expect(isValidAccent('url(javascript:alert(1))')).toBe(false)
    expect(isValidAccent('javascript:alert(1)')).toBe(false)
    expect(isValidAccent('expression(alert(1))')).toBe(false)
  })

  it('rejects a valid hex carrying trailing whitespace or a newline', () => {
    // No trimming happens on the way in, so these must not slip through.
    expect(isValidAccent('#abcdef ')).toBe(false)
    expect(isValidAccent(' #abcdef')).toBe(false)
    expect(isValidAccent('#abcdef\n')).toBe(false)
  })
})

describe('appearance constants', () => {
  it('offers exactly the three theme modes the settings UI expects', () => {
    expect([...THEMES]).toEqual(['light', 'dark', 'system'])
  })

  it('has one null-valued preset (the default) and unique keys', () => {
    expect(ACCENTS.filter((a) => a.value === null)).toHaveLength(1)
    expect(new Set(ACCENTS.map((a) => a.key)).size).toBe(ACCENTS.length)
  })

  it('gives every preset a swatch to render', () => {
    for (const accent of ACCENTS) expect(accent.swatch).not.toBe('')
  })
})
