import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Next.js dev (HMR) re-evaluates this module on every file change. Without caching the
// client on globalThis, each reload opens a NEW postgres pool and never closes the old
// ones — connections pile up until Supabase's session pooler rejects everything with
// `EMAXCONNSESSION: max clients reached (pool_size: 15)`.
//
// `max: 5` keeps one server well under that cap (and leaves room for a second dev
// server or a one-off script). Production on serverless should move to the transaction
// pooler (:6543) with `prepare: false` — see docs/database.md.
const globalForDb = globalThis as unknown as {
  __pgClient?: ReturnType<typeof postgres>
}

const client = globalForDb.__pgClient ?? postgres(process.env.DATABASE_URL!, { max: 5 })

if (process.env.NODE_ENV !== 'production') globalForDb.__pgClient = client

export const db = drizzle(client, { schema })

export * from './schema'
