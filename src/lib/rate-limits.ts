import 'server-only'
import { isDemoRestaurant } from '@/lib/demo'
import type { RateLimitRule } from '@/lib/db/queries/rate-limit'

// Quotas for the endpoints that spend Anthropic credit. Collected here (rather than
// inline at each call site) so the whole cost exposure is legible in one place.
//
// Demo Kitchen gets its own much tighter ceiling because anyone can enter it with one
// click from the login page — it is the cheapest thing on the internet to abuse. Limits
// stay non-zero so a visitor can still try the flagship scan/paste features — just not
// in a loop. Demo quotas carry a daily ceiling on top of the hourly one: an hourly cap
// alone still lets a patient script spend 24x it every day.

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

// Recipe paste + photo scan. The most expensive calls in the app (a vision request runs
// up to 30s), and the ones a script can fire back to back.
const SCAN_PER_USER_HOURLY = 5
const SCAN_PER_RESTAURANT_HOURLY = 20
const SCAN_DEMO_HOURLY = 3
const SCAN_DEMO_DAILY = 10

// Translation batches. Real use is bursty but small — a cold-cache dashboard is a
// handful of calls, and everything after that is served from the cache — so this is
// generous enough that a working kitchen will never see it.
const TRANSLATE_PER_RESTAURANT_HOURLY = 200
const TRANSLATE_DEMO_HOURLY = 60
const TRANSLATE_DEMO_DAILY = 300

// The demo button reseeds the whole kitchen (and drops its translation cache) on every
// click, so looping it is both a database load and an indirect way to force fresh
// translations. A real visitor clicks it once or twice.
const DEMO_LOGIN_PER_IP_HOURLY = 10
// Global ceiling on reseeds, for a script rotating IPs. Past it visitors still get in —
// they just share the current kitchen instead of a fresh one.
const DEMO_RESET_HOURLY = 60

// Image uploads aren't an LLM cost, but the demo is the one place a stranger can write
// to Storage, and its reset drops the rows without the objects — so without a cap a
// script could fill the free-tier storage quota through the app.
const UPLOAD_DEMO_DAILY = 20

// Recipe parse/scan: bounded per user AND per restaurant, so one member can't spend the
// whole kitchen's quota and the kitchen as a whole still has a ceiling.
export function recipeAiRules(restaurantId: string, userId: string): RateLimitRule[] {
  if (isDemoRestaurant(restaurantId)) {
    return [
      { key: `recipe-ai:demo:${restaurantId}`, limit: SCAN_DEMO_HOURLY, windowMs: HOUR_MS },
      { key: `recipe-ai:demo-daily:${restaurantId}`, limit: SCAN_DEMO_DAILY, windowMs: DAY_MS },
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
export function translationRules(restaurantId: string): RateLimitRule[] {
  if (isDemoRestaurant(restaurantId)) {
    return [
      { key: `translate:restaurant:${restaurantId}`, limit: TRANSLATE_DEMO_HOURLY, windowMs: HOUR_MS },
      { key: `translate:demo-daily:${restaurantId}`, limit: TRANSLATE_DEMO_DAILY, windowMs: DAY_MS },
    ]
  }
  return [
    {
      key: `translate:restaurant:${restaurantId}`,
      limit: TRANSLATE_PER_RESTAURANT_HOURLY,
      windowMs: HOUR_MS,
    },
  ]
}

export function demoLoginRule(ip: string): RateLimitRule {
  return { key: `demo-login:ip:${ip}`, limit: DEMO_LOGIN_PER_IP_HOURLY, windowMs: HOUR_MS }
}

export function demoResetRule(): RateLimitRule {
  return { key: 'demo-reset:global', limit: DEMO_RESET_HOURLY, windowMs: HOUR_MS }
}

// Empty for real restaurants — their uploads are bounded by who can sign in, not a quota.
export function uploadRules(restaurantId: string): RateLimitRule[] {
  if (!isDemoRestaurant(restaurantId)) return []
  return [{ key: `upload:demo-daily:${restaurantId}`, limit: UPLOAD_DEMO_DAILY, windowMs: DAY_MS }]
}
