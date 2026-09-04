import { describe, it, expect } from 'vitest'
import { formatQuantity, formatUnit, formatAmount, UNITS, UNIT_VALUES } from '@/lib/units'

describe('formatQuantity', () => {
  // The case the source comment calls out: numeric columns come back as strings, and a
  // quantity-less ingredient ("salt to taste") must render blank rather than "0".
  it('renders a missing quantity as blank, never "0"', () => {
    expect(formatQuantity(null)).toBe('')
    expect(formatQuantity('')).toBe('')
    expect(formatQuantity('   ')).toBe('')
  })

  it('keeps an explicit zero', () => {
    expect(formatQuantity('0')).toBe('0')
  })

  it('trims the trailing zeros Postgres numeric adds', () => {
    expect(formatQuantity('1.50')).toBe('1.5')
    expect(formatQuantity('2.00')).toBe('2')
    expect(formatQuantity('0.25')).toBe('0.25')
  })

  it('passes through unparseable text unchanged', () => {
    expect(formatQuantity('to taste')).toBe('to taste')
  })
})

describe('formatUnit', () => {
  it('pluralizes word-like units in English but not abbreviations', () => {
    expect(formatUnit('lb', 1)).toBe('lb')
    expect(formatUnit('lb', 2)).toBe('lbs')
    expect(formatUnit('case', 1)).toBe('case')
    expect(formatUnit('case', 3)).toBe('cases')
    expect(formatUnit('bunch', 2)).toBe('bunches')
    // Abbreviations don't take an s.
    expect(formatUnit('qt', 2)).toBe('qt')
    expect(formatUnit('gal', 5)).toBe('gal')
  })

  it('pluralizes in Spanish', () => {
    expect(formatUnit('lb', 1, 'es')).toBe('libra')
    expect(formatUnit('lb', 2, 'es')).toBe('libras')
    expect(formatUnit('gal', 2, 'es')).toBe('galones')
    expect(formatUnit('tray', 4, 'es')).toBe('bandejas')
  })

  it('renders metric abbreviations identically in both languages', () => {
    for (const unit of ['kg', 'g', 'L']) {
      expect(formatUnit(unit, 3, 'en')).toBe(formatUnit(unit, 3, 'es'))
      expect(formatUnit(unit, 1, 'en')).toBe(formatUnit(unit, 1, 'es'))
    }
  })

  it('maps "each" to c/u in Spanish and never pluralizes it', () => {
    expect(formatUnit('each', 1, 'es')).toBe('c/u')
    expect(formatUnit('each', 9, 'es')).toBe('c/u')
    expect(formatUnit('each', 9, 'en')).toBe('each')
  })

  it('returns a custom restaurant unit verbatim in both languages', () => {
    // Custom units are translated upstream via the content cache, not here.
    expect(formatUnit('lexan', 2)).toBe('lexan')
    expect(formatUnit('6-pan', 2, 'es')).toBe('6-pan')
  })

  it('accepts a quantity as either a string or a number', () => {
    expect(formatUnit('lb', '2')).toBe('lbs')
    expect(formatUnit('lb', '1')).toBe('lb')
    expect(formatUnit('lb', '1.0')).toBe('lb')
  })

  it('falls back to the singular for an unparseable quantity', () => {
    expect(formatUnit('lb', 'to taste')).toBe('lb')
  })
})

describe('formatAmount', () => {
  it('joins quantity and pluralized unit', () => {
    expect(formatAmount('2', 'lb')).toBe('2 lbs')
    expect(formatAmount('1', 'lb')).toBe('1 lb')
    expect(formatAmount('1.50', 'qt')).toBe('1.5 qt')
    expect(formatAmount('2', 'lb', 'es')).toBe('2 libras')
  })

  it('falls back to the bare unit when there is no quantity', () => {
    expect(formatAmount('', 'lb')).toBe('lbs')
    expect(formatAmount(null, 'case')).toBe('cases')
  })

  it('returns blank when there is neither quantity nor unit', () => {
    expect(formatAmount(null, null)).toBe('')
    expect(formatAmount('', null)).toBe('')
  })

  it('returns just the quantity when there is no unit', () => {
    expect(formatAmount('3', null)).toBe('3')
  })
})

describe('the built-in unit table', () => {
  it('has an entry for every unit value, with no gaps in either language', () => {
    expect(UNITS).toHaveLength(UNIT_VALUES.length)
    for (const unit of UNIT_VALUES) {
      const entry = UNITS.find((u) => u.value === unit)
      expect(entry, `missing table entry for "${unit}"`).toBeDefined()
      // A blank label would silently render an empty unit in the UI.
      expect(entry!.label).not.toBe('')
      expect(entry!.labelPlural).not.toBe('')
      expect(entry!.labelEs).not.toBe('')
      expect(entry!.labelPluralEs).not.toBe('')
    }
  })

  it('has no duplicate unit values', () => {
    expect(new Set(UNIT_VALUES).size).toBe(UNIT_VALUES.length)
  })
})
