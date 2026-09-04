import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// lib/db/index.ts opens a postgres pool at module load, so the db module is mocked
// rather than imported. The drizzle operator surface is stubbed too: these tests assert
// behavior (allowed / window / fail-open), not generated SQL, and feeding plain-object
// column stubs into the real eq()/lt() builders would be fragile.

const insertChain = {
  values: vi.fn(),
  onConflictDoUpdate: vi.fn(),
  returning: vi.fn(),
}

const deleteChain = {
  where: vi.fn(),
}

const db = {
  insert: vi.fn(() => insertChain),
  delete: vi.fn(() => deleteChain),
}

vi.mock('@/lib/db', () => ({
  db,
  rateLimits: {
    bucketKey: 'bucket_key',
    windowStart: 'window_start',
    count: 'count',
    updatedAt: 'updated_at',
  },
}))

vi.mock('drizzle-orm', () => ({
  lt: (...args: unknown[]) => ({ op: 'lt', args }),
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
}))

const { consumeRateLimit, consumeRateLimits } = await import('@/lib/db/queries/rate-limit')

/** Makes the next insert resolve as though Postgres returned `count`. */
function resolveCount(count: number) {
  insertChain.values.mockReturnValue(insertChain)
  insertChain.onConflictDoUpdate.mockReturnValue(insertChain)
  insertChain.returning.mockResolvedValue([{ count }])
}

/** Makes the next insert reject, simulating an unreachable database. */
function rejectInsert(error = new Error('connection refused')) {
  insertChain.values.mockReturnValue(insertChain)
  insertChain.onConflictDoUpdate.mockReturnValue(insertChain)
  insertChain.returning.mockRejectedValue(error)
}

const rule = { key: 'recipe-ai:user:u1', limit: 5, windowMs: 60 * 60 * 1000 }

beforeEach(() => {
  vi.clearAllMocks()
  deleteChain.where.mockResolvedValue(undefined)
  // The 1%-probability opportunistic cleanup would otherwise fire nondeterministically.
  vi.spyOn(Math, 'random').mockReturnValue(0.5)
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-06-04T15:37:12.345Z'))
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('consumeRateLimit', () => {
  it('allows a request while the count is at or under the limit', async () => {
    resolveCount(1)
    expect((await consumeRateLimit(rule)).allowed).toBe(true)

    resolveCount(5)
    expect((await consumeRateLimit(rule)).allowed).toBe(true)
  })

  it('rejects the first request past the limit', async () => {
    // The boundary matters: the returned count is post-increment, so count === limit
    // is the last allowed call and limit + 1 is the first rejection.
    resolveCount(6)
    expect((await consumeRateLimit(rule)).allowed).toBe(false)

    resolveCount(600)
    expect((await consumeRateLimit(rule)).allowed).toBe(false)
  })

  it('floors the window so concurrent callers contend on one row', async () => {
    // This is what makes the single atomic upsert correct across serverless instances:
    // every caller in the same hour must target the same (bucket_key, window_start) row.
    resolveCount(1)
    await consumeRateLimit(rule)

    const inserted = insertChain.values.mock.calls[0][0] as {
      bucketKey: string
      windowStart: Date
      count: number
    }
    expect(inserted.bucketKey).toBe(rule.key)
    expect(inserted.count).toBe(1)
    expect(inserted.windowStart.getTime() % rule.windowMs).toBe(0)
    // 15:37:12.345 floors to 15:00:00.000 for an hourly window.
    expect(inserted.windowStart.toISOString()).toBe('2026-06-04T15:00:00.000Z')
  })

  it('puts every caller in the same window into the same row', async () => {
    resolveCount(1)
    await consumeRateLimit(rule)
    vi.setSystemTime(new Date('2026-06-04T15:59:59.999Z'))
    resolveCount(2)
    await consumeRateLimit(rule)

    const first = insertChain.values.mock.calls[0][0] as { windowStart: Date }
    const second = insertChain.values.mock.calls[1][0] as { windowStart: Date }
    expect(second.windowStart.getTime()).toBe(first.windowStart.getTime())
  })

  it('starts a new row when the window rolls over', async () => {
    resolveCount(1)
    await consumeRateLimit(rule)
    vi.setSystemTime(new Date('2026-06-04T16:00:00.000Z'))
    resolveCount(1)
    await consumeRateLimit(rule)

    const first = insertChain.values.mock.calls[0][0] as { windowStart: Date }
    const second = insertChain.values.mock.calls[1][0] as { windowStart: Date }
    expect(second.windowStart.getTime()).toBe(first.windowStart.getTime() + rule.windowMs)
  })

  it('reports the time remaining in the window', async () => {
    resolveCount(1)
    const { retryAfterMs } = await consumeRateLimit(rule)
    // 15:37:12.345 -> 16:00:00.000 is 22m 47.655s.
    expect(retryAfterMs).toBe(22 * 60_000 + 47_655)
  })

  it('uses a single atomic upsert rather than a read-then-write', async () => {
    // A SELECT-then-UPDATE would let two instances read the same stale count and lose
    // an increment. The upsert is what makes the counter correct under concurrency.
    resolveCount(1)
    await consumeRateLimit(rule)
    expect(db.insert).toHaveBeenCalledTimes(1)
    expect(insertChain.onConflictDoUpdate).toHaveBeenCalledTimes(1)
  })

  it('fails open and logs when the database is unreachable', async () => {
    // Documented trade-off: a limiter outage means the DB is down, and blocking every
    // chef is worse than briefly losing a cost guard -- but it must not do so silently.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    rejectInsert()

    const result = await consumeRateLimit(rule)
    expect(result).toEqual({ allowed: true, retryAfterMs: 0 })
    expect(consoleError).toHaveBeenCalledOnce()
  })

  it('allows the request when the upsert returns no row', async () => {
    insertChain.values.mockReturnValue(insertChain)
    insertChain.onConflictDoUpdate.mockReturnValue(insertChain)
    insertChain.returning.mockResolvedValue([])
    expect((await consumeRateLimit(rule)).allowed).toBe(true)
  })

  it('runs the opportunistic cleanup only when the dice say so', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    resolveCount(1)
    await consumeRateLimit(rule)
    expect(db.delete).not.toHaveBeenCalled()

    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    resolveCount(1)
    await consumeRateLimit(rule)
    expect(db.delete).toHaveBeenCalledTimes(1)
  })

  it('does not surface a cleanup failure to the caller', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    deleteChain.where.mockRejectedValue(new Error('cleanup blew up'))
    resolveCount(1)
    await expect(consumeRateLimit(rule)).resolves.toEqual({
      allowed: true,
      retryAfterMs: 22 * 60_000 + 47_655,
    })
  })
})

describe('consumeRateLimits', () => {
  const perUser = { key: 'recipe-ai:user:u1', limit: 5, windowMs: 60 * 60 * 1000 }
  const perRestaurant = { key: 'recipe-ai:restaurant:r1', limit: 20, windowMs: 60 * 60 * 1000 }

  it('allows when every rule is under its limit', async () => {
    resolveCount(1)
    const result = await consumeRateLimits([perUser, perRestaurant])
    expect(result.allowed).toBe(true)
    expect(db.insert).toHaveBeenCalledTimes(2)
  })

  it('stops at the first exceeded rule without consuming the rest', async () => {
    resolveCount(99)
    const result = await consumeRateLimits([perUser, perRestaurant])
    expect(result.allowed).toBe(false)
    // Only the per-user bucket was touched; the per-restaurant one was never charged.
    expect(db.insert).toHaveBeenCalledTimes(1)
  })

  it('still counts rules that pass before the failing one', async () => {
    // A request rejected downstream has still been attempted, so counting it is
    // intended -- this pins that behavior so it is not "fixed" by accident.
    insertChain.values.mockReturnValue(insertChain)
    insertChain.onConflictDoUpdate.mockReturnValue(insertChain)
    insertChain.returning
      .mockResolvedValueOnce([{ count: 1 }])
      .mockResolvedValueOnce([{ count: 21 }])

    const result = await consumeRateLimits([perUser, perRestaurant])
    expect(result.allowed).toBe(false)
    expect(db.insert).toHaveBeenCalledTimes(2)
  })

  it('returns the longest retry across the rules it consumed', async () => {
    resolveCount(1)
    const short = { key: 'a', limit: 10, windowMs: 1000 }
    const long = { key: 'b', limit: 10, windowMs: 60 * 60 * 1000 }
    const result = await consumeRateLimits([short, long])
    expect(result.allowed).toBe(true)
    expect(result.retryAfterMs).toBeGreaterThan(1000)
  })

  it('allows an empty rule set', async () => {
    const result = await consumeRateLimits([])
    expect(result).toEqual({ allowed: true, retryAfterMs: 0 })
    expect(db.insert).not.toHaveBeenCalled()
  })
})
