# kitchen-app

A mobile-first kitchen prep tool. Chefs build prep lists and recipes; Prep cooks see everything natively in English or kitchen-accurate Spanish.

## Local setup (fresh clone)

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create `.env.local`** — copy the template and fill in the real values:
   ```bash
   cp .env.example .env.local
   ```
   `.env.local` is gitignored (secrets never go in the repo), so it does **not**
   come down with a clone. You must recreate it on each machine. Get the values
   from your Vercel project env vars or the Supabase dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — Supabase → Project Settings → API
   - `DATABASE_URL` — Supabase connection string. **Use the pooler host**, not the
     direct host (the direct host is IPv6-only and won't connect).
   - `ANTHROPIC_API_KEY` — for translation / recipe parsing.

3. **Run the dev server**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000.

No local database setup is needed — the app connects to the shared cloud Supabase
instance, which already has all migrations applied.

## Database migrations

Migrations live in `drizzle/migrations/` and are already applied to the shared
Supabase database. You only touch them when changing the schema — see
[docs/database.md](docs/database.md) for the generate/apply workflow. Do **not**
run `drizzle-kit push`.

## Docs

- [docs/overview.md](docs/overview.md) — product scope, v1 features, roadmap, stack
- [docs/database.md](docs/database.md) — DB map, migration workflow, RLS model
- [docs/i18n.md](docs/i18n.md) — UI string internationalization
- [docs/translation-validation.md](docs/translation-validation.md) — kitchen Spanish glossary
- [docs/test-accounts.md](docs/test-accounts.md) — login credentials for testing
