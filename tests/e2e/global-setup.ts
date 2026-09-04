import { loadE2eEnv, SKIP_MESSAGE } from './env'
import { purgeE2eUser, createE2eUser } from './admin'

// Recreates the E2E account from scratch before the run. Purge-then-create rather than
// create-if-missing so a crashed previous run can't leave half-built state behind.
export default async function globalSetup() {
  const env = loadE2eEnv()
  if (!env.ok) {
    console.warn(`\n[e2e] skipping setup -- missing ${env.missing.join(', ')}.\n${SKIP_MESSAGE}\n`)
    return
  }

  try {
    await purgeE2eUser()
    await createE2eUser()
    console.log('[e2e] test account ready')
  } catch (error) {
    // Most likely a paused free-tier Supabase project. Fail loudly with the real
    // reason rather than letting every spec time out on a login page.
    console.error('\n[e2e] could not prepare the test account:', error)
    throw error
  }
}
