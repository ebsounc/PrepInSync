import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Next.js dev (HMR) re-evaluates this module on every file change. Without caching the
// client on globalThis, each reload opens a NEW postgres pool and never closes the old
// ones — connections pile up until Supabase's pooler rejects everything with
// `EMAXCONNSESSION: max clients reached (pool_size: 15)`.
const globalForDb = globalThis as unknown as {
  __pgClient?: ReturnType<typeof postgres>
}

// Serverless needs a different connection profile than a long-lived dev server, and
// getting this wrong is not theoretical: production ran on the SESSION pooler (:5432)
// with max: 5 and threw `EMAXCONNSESSION ... pool_size: 15` under concurrent traffic —
// three warm instances were enough to exhaust the cap and 500 the whole app.
//
// On Vercel, instances scale out horizontally, so the scarce resource is pooler slots
// shared across instances rather than connections within one. Keeping max at 1 there
// means N instances cost N connections instead of 5N — with the session pooler's cap of
// 15 that is the difference between ~3 instances and ~15 before everything 500s. A
// single local dev server benefits from a few, and leaves room for a one-off script.
//
// This is a mitigation, not the fix: DATABASE_URL must point at the TRANSACTION pooler
// (:6543) in production, where client connections are multiplexed and the ceiling is far
// higher. See docs/database.md.
const isServerless = Boolean(process.env.VERCEL)

const client =
  globalForDb.__pgClient ??
  postgres(process.env.DATABASE_URL!, {
    max: isServerless ? 1 : 5,
    // Transaction-mode pooling multiplexes one server connection across clients, so
    // named prepared statements can't be relied on to still exist. Set unconditionally
    // rather than only when serverless: it is valid on both poolers, and making dev and
    // production differ here is exactly how you ship a bug that only appears in prod.
    prepare: false,
  })

if (process.env.NODE_ENV !== 'production') globalForDb.__pgClient = client

export const db = drizzle(client, { schema })

export * from './schema'
