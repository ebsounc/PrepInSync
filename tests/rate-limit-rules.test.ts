import { describe, it, expect } from 'vitest'
import { recipeAiRules, translationRule } from '@/lib/rate-limits'
import { DEMO_RESTAURANT_ID, isDemoRestaurant } from '@/lib/demo'

const RESTAURANT = '11111111-1111-4111-8111-111111111111'
const USER = '22222222-2222-4222-8222-222222222222'
const HOUR_MS = 60 * 60 * 1000

describe('isDemoRestaurant', () => {
  it('matches only the seeded demo id', () => {
    expect(isDemoRestaurant(DEMO_RESTAURANT_ID)).toBe(true)
    expect(isDemoRestaurant(RESTAURANT)).toBe(false)
    expect(isDemoRestaurant(null)).toBe(false)
    expect(isDemoRestaurant(undefined)).toBe(false)
    expect(isDemoRestaurant('')).toBe(false)
  })
})

describe('recipeAiRules', () => {
  it('bounds a real restaurant per user AND per restaurant', () => {
    // Two rules so one member cannot spend the whole kitchen's quota, while the
    // kitchen as a whole still has a ceiling.
    const rules = recipeAiRules(RESTAURANT, USER)
    expect(rules).toHaveLength(2)

    const keys = rules.map((r) => r.key)
    expect(keys).toContain(`recipe-ai:user:${USER}`)
    expect(keys).toContain(`recipe-ai:restaurant:${RESTAURANT}`)
  })

  it('gives the per-restaurant bucket a higher ceiling than the per-user one', () => {
    const rules = recipeAiRules(RESTAURANT, USER)
    const perUser = rules.find((r) => r.key.startsWith('recipe-ai:user:'))!
    const perRestaurant = rules.find((r) => r.key.startsWith('recipe-ai:restaurant:'))!
    expect(perRestaurant.limit).toBeGreaterThan(perUser.limit)
  })

  it('replaces both rules with one much tighter rule for the public demo', () => {
    // The demo password is printed in the README, so it is the one account whose
    // credentials every visitor already has.
    const rules = recipeAiRules(DEMO_RESTAURANT_ID, USER)
    expect(rules).toHaveLength(1)
    expect(rules[0].key).toBe(`recipe-ai:demo:${DEMO_RESTAURANT_ID}`)

    const realPerUser = recipeAiRules(RESTAURANT, USER).find((r) =>
      r.key.startsWith('recipe-ai:user:')
    )!
    expect(rules[0].limit).toBeLessThan(realPerUser.limit)
  })

  it('does not key the demo bucket by user, so visitors share one quota', () => {
    const a = recipeAiRules(DEMO_RESTAURANT_ID, 'user-a')
    const b = recipeAiRules(DEMO_RESTAURANT_ID, 'user-b')
    expect(a[0].key).toBe(b[0].key)
  })

  it('keeps the demo quota non-zero so a visitor can still try the flagship scan', () => {
    expect(recipeAiRules(DEMO_RESTAURANT_ID, USER)[0].limit).toBeGreaterThan(0)
  })

  it('uses an hourly window', () => {
    for (const rule of recipeAiRules(RESTAURANT, USER)) expect(rule.windowMs).toBe(HOUR_MS)
    expect(recipeAiRules(DEMO_RESTAURANT_ID, USER)[0].windowMs).toBe(HOUR_MS)
  })
})

describe('translationRule', () => {
  it('is keyed per restaurant, not per user', () => {
    // Translation happens during render on a cache miss, not from a deliberate user
    // action, so attributing it to whoever loaded the page first would be arbitrary.
    const rule = translationRule(RESTAURANT)
    expect(rule.key).toBe(`translate:restaurant:${RESTAURANT}`)
    expect(rule.windowMs).toBe(HOUR_MS)
  })

  it('gives the demo a lower ceiling than a real restaurant', () => {
    expect(translationRule(DEMO_RESTAURANT_ID).limit).toBeLessThan(
      translationRule(RESTAURANT).limit
    )
    expect(translationRule(DEMO_RESTAURANT_ID).limit).toBeGreaterThan(0)
  })

  it('is generous enough for a real kitchen not to notice it', () => {
    // A cold-cache dashboard is a handful of calls; everything after is cache reads.
    expect(translationRule(RESTAURANT).limit).toBeGreaterThanOrEqual(100)
  })

  it('separates buckets across restaurants', () => {
    expect(translationRule(RESTAURANT).key).not.toBe(translationRule('other-id').key)
  })
})
