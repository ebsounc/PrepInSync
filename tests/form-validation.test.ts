import { describe, it, expect } from 'vitest'
import { getDictionary } from '@/lib/i18n'
import {
  requiredError,
  emailError,
  passwordError,
  confirmPasswordError,
  collectErrors,
  PASSWORD_MIN_LENGTH,
} from '@/lib/form-validation'

const dict = getDictionary('en')
const es = getDictionary('es')

describe('requiredError', () => {
  it('flags empty and whitespace-only values', () => {
    expect(requiredError('', dict)).toBe(dict.errors.validation.required)
    expect(requiredError('   ', dict)).toBe(dict.errors.validation.required)
  })

  it('accepts any real value', () => {
    expect(requiredError('Ana', dict)).toBeUndefined()
    expect(requiredError('  Ana  ', dict)).toBeUndefined()
  })
})

describe('emailError', () => {
  it('flags a missing address as required rather than invalid', () => {
    expect(emailError('', dict)).toBe(dict.errors.validation.required)
    expect(emailError('  ', dict)).toBe(dict.errors.validation.required)
  })

  it('accepts ordinary addresses', () => {
    expect(emailError('cook@kitchen.test', dict)).toBeUndefined()
    expect(emailError('  cook@kitchen.test  ', dict)).toBeUndefined()
    expect(emailError('first.last+tag@sub.kitchen.test', dict)).toBeUndefined()
  })

  it('catches the obvious typos it is meant to catch', () => {
    // Deliberately permissive -- Supabase is the authority. This only saves a round trip.
    for (const bad of ['cook', 'cook@', '@kitchen.test', 'cook@kitchen', 'a b@c.test']) {
      expect(emailError(bad, dict), `"${bad}" should be rejected`).toBe(
        dict.errors.validation.emailInvalid
      )
    }
  })
})

describe('passwordError', () => {
  it('flags an empty password as required', () => {
    expect(passwordError('', dict)).toBe(dict.errors.validation.required)
  })

  it('enforces the minimum length at the boundary', () => {
    expect(passwordError('a'.repeat(PASSWORD_MIN_LENGTH - 1), dict)).toBe(
      dict.errors.validation.passwordTooShort
    )
    expect(passwordError('a'.repeat(PASSWORD_MIN_LENGTH), dict)).toBeUndefined()
  })

  it('does not trim -- spaces are legitimate password characters', () => {
    expect(passwordError('        ', dict)).toBeUndefined()
  })
})

describe('confirmPasswordError', () => {
  it('flags an empty confirmation as required', () => {
    expect(confirmPasswordError('', 'DemoKitchen1!', dict)).toBe(
      dict.errors.validation.required
    )
  })

  it('flags a mismatch', () => {
    expect(confirmPasswordError('DemoKitchen1', 'DemoKitchen1!', dict)).toBe(
      dict.errors.validation.passwordsNoMatch
    )
  })

  it('accepts an exact match', () => {
    expect(confirmPasswordError('DemoKitchen1!', 'DemoKitchen1!', dict)).toBeUndefined()
  })
})

describe('messages follow the user language, not the browser', () => {
  it('returns Spanish strings when given the Spanish dictionary', () => {
    // The whole reason these forms set noValidate: a Spanish-speaking cook on an
    // English phone was getting English messages from the browser.
    expect(requiredError('', es)).toBe(es.errors.validation.required)
    expect(requiredError('', es)).not.toBe(dict.errors.validation.required)
    expect(emailError('nope', es)).toBe(es.errors.validation.emailInvalid)
  })
})

describe('collectErrors', () => {
  it('drops undefined so the caller can test emptiness to decide whether to submit', () => {
    expect(collectErrors({ a: undefined, b: undefined })).toEqual({})
    expect(Object.keys(collectErrors({ a: undefined }))).toHaveLength(0)
  })

  it('keeps only the fields that actually failed', () => {
    expect(collectErrors({ email: 'bad email', password: undefined })).toEqual({
      email: 'bad email',
    })
  })

  it('drops empty-string messages too', () => {
    expect(collectErrors({ a: '' })).toEqual({})
  })
})
