import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { createAdminClient } from '@/lib/supabase/admin'

// Keeps the free-tier Supabase project from being paused for inactivity, which would
// take the public demo offline until someone resumed it by hand.
//
// Supabase pauses a Free project after ~7 days of low activity. Its docs count
// "API calls to your project" and "requests via connected applications", but they do
// NOT say whether a direct Postgres connection through the pooler counts on its own.
// So this pings BOTH paths rather than betting on one:
//   1. a `select 1` over the pooler (the app's own Drizzle connection), and
//   2. a HEAD-only count through the REST API gateway (real API traffic).
// Two trivial round trips a day, and no assumption about which one the heuristic sees.
//
// Auth uses `Authorization: Bearer <CRON_SECRET>` because that is exactly what Vercel
// Cron sends when CRON_SECRET is set, so the same route serves the Vercel cron and the
// independent GitHub Actions ping with no special-casing.
//
// GET (not POST) because Vercel Cron issues GET requests.

// Never cache or statically optimize -- the whole point is to actually run daily.
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // Fail closed, and check auth BEFORE touching the database, so an unauthenticated
  // flood costs a 401 and nothing else.
  const expected = process.env.CRON_SECRET
  if (!expected || request.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const results: { db: 'ok' | 'failed'; api: 'ok' | 'failed' } = { db: 'ok', api: 'ok' }

  // Both pings run even if the first fails: knowing which path is broken is the useful
  // signal, and a pooler outage says nothing about the API gateway.
  try {
    await db.execute(sql`select 1`)
  } catch (e) {
    console.error('keepalive: pooler ping failed', e)
    results.db = 'failed'
  }

  try {
    // head: true returns a count and no rows, so nothing is read out of the database.
    const { error } = await createAdminClient()
      .from('restaurants')
      .select('id', { head: true, count: 'exact' })
    if (error) throw new Error(error.message)
  } catch (e) {
    console.error('keepalive: REST ping failed', e)
    results.api = 'failed'
  }

  const ok = results.db === 'ok' && results.api === 'ok'
  // Non-200 on any failure so the GitHub Actions ping goes red and emails, rather than
  // reporting success while the project quietly drifts toward a pause.
  return NextResponse.json({ ok, ...results, at: new Date().toISOString() }, {
    status: ok ? 200 : 503,
  })
}
