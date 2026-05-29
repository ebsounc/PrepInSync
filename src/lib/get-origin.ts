import 'server-only'
import { headers } from 'next/headers'

// Prefer a deploy-time origin so auth redirect URLs don't depend on the
// client-controlled Origin/Host headers. Falls back to request headers in dev.
export async function getOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }
  const h = await headers()
  return h.get('origin') ?? `https://${h.get('host')}`
}
