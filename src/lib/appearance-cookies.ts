import 'server-only'
import { cookies } from 'next/headers'
import { isValidAccent, type Theme } from './appearance'

// Theme + accent are mirrored to cookies (like the `lang` cookie) so the root layout
// can render the right theme/accent server-side on first paint, with no DB round-trip
// and no flash. profile.theme / profile.accentColor is the source of truth once logged
// in; these cookies just carry the resolved value to the edge.

export const APPEARANCE_COOKIE_OPTS = {
  path: '/',
  maxAge: 60 * 60 * 24 * 365,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
}

function asTheme(v: string | undefined): Theme | undefined {
  return v === 'light' || v === 'dark' || v === 'system' ? v : undefined
}

export async function getThemeCookie(): Promise<Theme | undefined> {
  const store = await cookies()
  return asTheme(store.get('theme')?.value)
}

// Returns the accent cookie ONLY if it passes validation — defense in depth, since
// the cookie is user-editable and its value is inlined into a `style` attribute.
export async function getAccentCookie(): Promise<string | undefined> {
  const store = await cookies()
  const v = store.get('accent')?.value
  return v && isValidAccent(v) ? v : undefined
}

// Sets both cookies from a saved appearance. A null accent = the default (green),
// so the override cookie is cleared rather than stored.
export async function setAppearanceCookies(theme: Theme, accent: string | null): Promise<void> {
  const store = await cookies()
  store.set('theme', theme, APPEARANCE_COOKIE_OPTS)
  // Validate here too so a bad value from any caller (e.g. a stale DB row on login)
  // never lands in the cookie — the single choke point for the accent write path.
  const safeAccent = isValidAccent(accent) ? accent : null
  if (safeAccent) store.set('accent', safeAccent, APPEARANCE_COOKIE_OPTS)
  else store.delete({ name: 'accent', path: '/' })
}

// Clear on logout so a shared device never leaves one user's theme cookie behind for
// the next user (the root layout treats a present theme cookie as authoritative).
export async function clearAppearanceCookies(): Promise<void> {
  const store = await cookies()
  store.delete({ name: 'theme', path: '/' })
  store.delete({ name: 'accent', path: '/' })
}
