import 'server-only'
import { isDemoRestaurant } from '@/lib/demo'
import type { RateLimitRule } from '@/lib/db/queries/rate-limit'

// Quotas for the endpoints that spend Anthropic credit. Collected here (rather than
// inline at each call site) so the whole cost exposure is legible in one place.
//
// Demo Kitchen gets its own much tighter ceiling because its password is published in
// the README: it is the one account whose credentials any visitor already has, so it
// is the cheapest thing on the internet to abuse. Limits stay non-zero so a visitor
// can still try the flagship scan/paste features — just not in a loop.

const HOUR_MS = 60 * 60 * 1000

// Recipe paste + photo scan. The most expensive calls in the app (a vision request runs
// up to 30s), and the ones a script can fire back to back.
const SCAN_PER_USER_HOURLY = 5
const SCAN_PER_RESTAURANT_HOURLY = 20
const SCAN_DEMO_HOURLY = 3

// Translation batches. Real use is bursty but small — a cold-cache dashboard is a
// handful of calls, and everything after that is served from the cache — so this is
// generous enough that a working kitchen will never see it.
const TRANSLATE_PER_RESTAURANT_HOURLY = 200
const TRANSLATE_DEMO_HOURLY = 60

// Recipe parse/scan: bounded per user AND per restaurant, so one member can't spend the
// whole kitchen's quota and the kitchen as a whole still has a ceiling.
export function recipeAiRules(restaurantId: string, userId: string): RateLimitRule[] {
  if (isDemoRestaurant(restaurantId)) {
    return [
      { key: `recipe-ai:demo:${restaurantId}`, limit: SCAN_DEMO_HOURLY, windowMs: HOUR_MS },
    ]
  }
  return [
    { key: `recipe-ai:user:${userId}`, limit: SCAN_PER_USER_HOURLY, windowMs: HOUR_MS },
    {
      key: `recipe-ai:restaurant:${restaurantId}`,
      limit: SCAN_PER_RESTAURANT_HOURLY,
      windowMs: HOUR_MS,
    },
  ]
}

// Translation: per-restaurant only. These calls happen during render on a cache miss,
// not from a deliberate user action, so attributing them to whoever happened to load
// the page first would be arbitrary.
export function translationRule(restaurantId: string): RateLimitRule {
  return {
    key: `translate:restaurant:${restaurantId}`,
    limit: isDemoRestaurant(restaurantId) ? TRANSLATE_DEMO_HOURLY : TRANSLATE_PER_RESTAURANT_HOURLY,
    windowMs: HOUR_MS,
  }
}
