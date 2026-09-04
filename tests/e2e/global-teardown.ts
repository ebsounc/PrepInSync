import { loadE2eEnv } from './env'
import { purgeE2eUser } from './admin'

// Leaves the database as it was found. Never throws: a teardown failure must not turn
// a passing run red, and the next globalSetup purges anything left behind anyway.
export default async function globalTeardown() {
  if (!loadE2eEnv().ok) return
  try {
    await purgeE2eUser()
    console.log('[e2e] test account cleaned up')
  } catch (error) {
    console.warn('[e2e] cleanup failed (next run will purge):', error)
  }
}
