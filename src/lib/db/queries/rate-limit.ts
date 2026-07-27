import 'server-only'
import { lt, sql } from 'drizzle-orm'
import { db, rateLimits } from '@/lib/db'

// Fixed-window rate limiting for the paid LLM endpoints. Backed by Postgres rather
// than process memory on purpose: Vercel runs several serverless instances, so an
// in-memory counter would reset on every cold start and scale out into nothing.
//
// Fixed windows (not a sliding log) keep this to one row and one statement per check.
// The known trade-off is burstiness at a window boundary — a caller can spend its full
// quota at the end of one window and again at the start of the next. For a cost guard
// that's fine; the ceiling over any hour is still bounded to 2x, and the alternative
// costs more storage and a heavier query than this app needs.

export type RateLimitResult = {
  allowed: boolean
  /** Milliseconds until the current window rolls over. */
  retryAfterMs: number
}

export type RateLimitRule = {
  key: string
  limit: number
  windowMs: number
}

// Rows are only meaningful for the life of their window; anything older is dead
// weight. Cleaned opportunistically rather than on a schedule (no cron in this stack).
const CLEANUP_AGE_MS = 24 * 60 * 60 * 1000
const CLEANUP_PROBABILITY = 0.01

// Increments one bucket and reports whether the caller is still under its limit.
//
// The increment is a single INSERT ... ON CONFLICT DO UPDATE, which Postgres applies
// atomically — two instances checking the same bucket at the same moment can't both
// read a stale count and lose an increment, which a SELECT-then-UPDATE would allow.
export async function consumeRateLimit(rule: RateLimitRule): Promise<RateLimitResult> {
  const { key, limit, windowMs } = rule
  const now = Date.now()
  // Floor to the window so every caller in the same window targets the same row.
  const windowStartMs = Math.floor(now / windowMs) * windowMs
  const retryAfterMs = windowStartMs + windowMs - now

  try {
    const [row] = await db
      .insert(rateLimits)
      .values({ bucketKey: key, windowStart: new Date(windowStartMs), count: 1 })
      .onConflictDoUpdate({
        target: [rateLimits.bucketKey, rateLimits.windowStart],
        set: { count: sql`${rateLimits.count} + 1`, updatedAt: sql`now()` },
      })
      .returning({ count: rateLimits.count })

    if (Math.random() < CLEANUP_PROBABILITY) void cleanupExpired()

    return { allowed: (row?.count ?? 1) <= limit, retryAfterMs }
  } catch (e) {
    // Fail OPEN. A limiter outage means the database is unreachable, in which case
    // the request was going to fail on its own work anyway — and silently blocking
    // every chef from scanning a recipe is a worse outcome than briefly losing a
    // cost guard. Logged so it doesn't fail open quietly.
    console.error('rate limit check failed, allowing request', e)
    return { allowed: true, retryAfterMs: 0 }
  }
}

// Applies several rules (e.g. per-user AND per-restaurant) and fails on the first
// one exceeded. Rules before the failing one are still counted — an attempt that gets
// rejected downstream has still been made, so counting it is the intended behavior.
export async function consumeRateLimits(rules: RateLimitRule[]): Promise<RateLimitResult> {
  let longestRetry = 0
  for (const rule of rules) {
    const result = await consumeRateLimit(rule)
    if (!result.allowed) return result
    longestRetry = Math.max(longestRetry, result.retryAfterMs)
  }
  return { allowed: true, retryAfterMs: longestRetry }
}

async function cleanupExpired(): Promise<void> {
  try {
    await db
      .delete(rateLimits)
      .where(lt(rateLimits.windowStart, new Date(Date.now() - CLEANUP_AGE_MS)))
  } catch {
    // Best-effort housekeeping — never surface to the caller.
  }
}
