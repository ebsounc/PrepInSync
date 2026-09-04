// Shared env loading for the local E2E run.
//
// Each Playwright worker is its own process, and globalSetup's env does not propagate
// to them, so every entry point calls loadE2eEnv() rather than passing values around.
// Credentials are fixed constants for the same reason: no handoff needed, and a crashed
// run leaves a known account for the next setup to clean up.
//
// Uses process.loadEnvFile (Node 20.12+) so there's no dotenv dependency.

export const E2E_EMAIL = 'e2e@prepinsync.test'
export const E2E_PASSWORD = 'E2eKitchen1!'
export const E2E_FIRST_NAME = 'Eva'
export const E2E_LAST_NAME = 'Tester'
export const E2E_RESTAURANT = 'E2E Test Kitchen'

export type E2eEnv = {
  ok: boolean
  supabaseUrl: string
  serviceRoleKey: string
  missing: string[]
}

let cached: E2eEnv | undefined

export function loadE2eEnv(): E2eEnv {
  if (cached) return cached

  try {
    process.loadEnvFile('.env.local')
  } catch {
    // Absent or unreadable .env.local -- the missing-keys check below reports it.
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

  const missing: string[] = []
  if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!serviceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY')

  cached = { ok: missing.length === 0, supabaseUrl, serviceRoleKey, missing }
  return cached
}

export const SKIP_MESSAGE =
  'E2E needs .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, ' +
  'and a reachable Supabase project. This suite is local-only and never runs in CI.'
