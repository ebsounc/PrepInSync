import { NextResponse } from 'next/server'
import { ensureDemoAccounts, resetDemoData } from '@/lib/demo-seed'

// One-time (and manual) demo setup. Protected by DEMO_SETUP_SECRET, sent as a header
// (not a query param — keeps the secret out of access logs / browser history).
//   POST /api/demo/setup?full=1   -H "x-demo-secret: ..."   -> create/repair accounts + reseed
//   POST /api/demo/setup          -H "x-demo-secret: ..."   -> reseed data only
// Ongoing per-visitor resets happen automatically on demo login (no secret needed).
export async function POST(request: Request) {
  const secret = request.headers.get('x-demo-secret')
  // Fail closed: if the secret isn't configured, nobody gets in.
  if (!process.env.DEMO_SETUP_SECRET || secret !== process.env.DEMO_SETUP_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  try {
    const full = new URL(request.url).searchParams.get('full') === '1'
    if (full) await ensureDemoAccounts()
    await resetDemoData()
    return NextResponse.json({ ok: true, full })
  } catch (e) {
    // Log the detail server-side; don't leak internals (DB errors, stack) to the caller.
    console.error('demo setup failed', e)
    return NextResponse.json({ error: 'setup failed' }, { status: 500 })
  }
}
