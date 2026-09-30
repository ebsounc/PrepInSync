import { describe, it, expect } from 'vitest'
import {
  recipeAiRules,
  translationRules,
  demoLoginRule,
  demoResetRule,
  uploadRules,
} from '@/lib/rate-limits'
import { DEMO_RESTAURANT_ID, isDemoRestaurant } from '@/lib/demo'

const RESTAURANT = '11111111-1111-4111-8111-111111111111'
const USER = '22222222-2222-4222-8222-222222222222'
const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

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

  it('replaces both rules with much tighter hourly + daily rules for the public demo', () => {
    // Anyone can enter the demo with one click, so it is the cheapest account to abuse.
    const rules = recipeAiRules(DEMO_RESTAURANT_ID, USER)
    expect(rules.map((r) => r.key)).toEqual([
      `recipe-ai:demo:${DEMO_RESTAURANT_ID}`,
      `recipe-ai:demo-daily:${DEMO_RESTAURANT_ID}`,
    ])

    const realPerUser = recipeAiRules(RESTAURANT, USER).find((r) =>
      r.key.startsWith('recipe-ai:user:')
    )!
    expect(rules[0].limit).toBeLessThan(realPerUser.limit)
  })

  it('does not key the demo buckets by user, so visitors share one quota', () => {
    const a = recipeAiRules(DEMO_RESTAURANT_ID, 'user-a')
    const b = recipeAiRules(DEMO_RESTAURANT_ID, 'user-b')
    expect(a.map((r) => r.key)).toEqual(b.map((r) => r.key))
  })

  it('keeps the demo quota non-zero so a visitor can still try the flagship scan', () => {
    for (const rule of recipeAiRules(DEMO_RESTAURANT_ID, USER)) expect(rule.limit).toBeGreaterThan(0)
  })

  it('caps the demo per day, not just per hour', () => {
    // An hourly cap alone lets a patient script spend 24x it every day.
    const [hourly, daily] = recipeAiRules(DEMO_RESTAURANT_ID, USER)
    expect(hourly.windowMs).toBe(HOUR_MS)
    expect(daily.windowMs).toBe(DAY_MS)
    expect(daily.limit).toBeLessThan(hourly.limit * 24)
  })

  it('uses an hourly window for real restaurants', () => {
    for (const rule of recipeAiRules(RESTAURANT, USER)) expect(rule.windowMs).toBe(HOUR_MS)
  })
})

describe('translationRules', () => {
  it('is keyed per restaurant, not per user', () => {
    // Translation happens during render on a cache miss, not from a deliberate user
    // action, so attributing it to whoever loaded the page first would be arbitrary.
    const rules = translationRules(RESTAURANT)
    expect(rules).toHaveLength(1)
    expect(rules[0].key).toBe(`translate:restaurant:${RESTAURANT}`)
    expect(rules[0].windowMs).toBe(HOUR_MS)
  })

  it('gives the demo a lower hourly ceiling than a real restaurant', () => {
    const [demoHourly] = translationRules(DEMO_RESTAURANT_ID)
    expect(demoHourly.limit).toBeLessThan(translationRules(RESTAURANT)[0].limit)
    expect(demoHourly.limit).toBeGreaterThan(0)
  })

  it('caps the demo per day, below 24 hours of its hourly quota', () => {
    const [hourly, daily] = translationRules(DEMO_RESTAURANT_ID)
    expect(daily.windowMs).toBe(DAY_MS)
    expect(daily.limit).toBeLessThan(hourly.limit * 24)
  })

  it('is generous enough for a real kitchen not to notice it', () => {
    // A cold-cache dashboard is a handful of calls; everything after is cache reads.
    expect(translationRules(RESTAURANT)[0].limit).toBeGreaterThanOrEqual(100)
  })

  it('separates buckets across restaurants', () => {
    expect(translationRules(RESTAURANT)[0].key).not.toBe(translationRules('other-id')[0].key)
  })
})

describe('demoLoginRule', () => {
  it('is keyed per IP with an hourly window', () => {
    // A shared per-demo bucket would let one looping script lock every visitor out.
    expect(demoLoginRule('203.0.113.7').key).not.toBe(demoLoginRule('203.0.113.8').key)
    expect(demoLoginRule('203.0.113.7').windowMs).toBe(HOUR_MS)
    expect(demoLoginRule('203.0.113.7').limit).toBeGreaterThan(1)
  })
})

describe('demoResetRule', () => {
  it('is one global bucket that allows more resets than a single IP can trigger', () => {
    // Backstop for a script rotating IPs past the per-IP login limit.
    expect(demoResetRule().key).toBe('demo-reset:global')
    expect(demoResetRule().windowMs).toBe(HOUR_MS)
    expect(demoResetRule().limit).toBeGreaterThan(demoLoginRule('203.0.113.7').limit)
  })
})

describe('uploadRules', () => {
  it('leaves real restaurants unmetered', () => {
    expect(uploadRules(RESTAURANT)).toEqual([])
  })

  it('caps demo uploads per day', () => {
    const rules = uploadRules(DEMO_RESTAURANT_ID)
    expect(rules).toHaveLength(1)
    expect(rules[0].windowMs).toBe(DAY_MS)
    expect(rules[0].limit).toBeGreaterThan(0)
  })
})
