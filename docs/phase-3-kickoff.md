# Phase 3 kickoff — translation layer

Phases 1 (auth) and 2 (core prep) are complete and merged to `main`. Phase 3 is the
**bilingual translation layer** (English ↔ Spanish), per the build order in
[overview.md](overview.md). This doc is the starting point for the next session — what to
build on, the hard prerequisites, and the conventions. Read [CLAUDE.md](../CLAUDE.md)
"Translation rules" and [overview.md](overview.md) first.

## What Phase 3 is

Lazy, cached, glossary-backed translation so each user reads/writes in their preferred
language. Content is authored in one language (its source language) and each viewer sees
it in **their** language. Translate on first request for a given language, cache it,
invalidate the cache when the source text is edited. Bidirectional (either language can be
the source). Per-user language is `profiles.preferred_language` (`'en'|'es'`, CHECK-constrained).

## Build on what already exists

- **`translations` table** ([schema.ts](../src/lib/db/schema.ts)): the lazy cache, keyed by
  `(entity_type, entity_id, field, target_language)` with `source_hash` (MD5 of source text)
  for automatic staleness detection. See its table comment + [database.md](database.md)
  "Translation cache model".
- **`glossary_overrides` table**: user-confirmed term corrections, injected into prompts to
  enforce kitchen terms. A user override → write here → feeds future prompts.
- **[translation-validation.md](translation-validation.md)**: the kitchen-Spanish glossary +
  validation phrases — the source of truth for preferred terms (e.g. walk-in → "cuarto frío",
  sheet pan → "charola", fold → "incorporar suavemente").
- **`profiles.preferred_language`**: per-user `'en'|'es'`, already set at signup/onboarding.
- **Stack**: Vercel AI SDK + Claude API, **Sonnet 4.6** (per CLAUDE.md). `ANTHROPIC_API_KEY`
  is already in `.env.local`. **All LLM calls must go through `lib/ai/`** — that directory
  does **not exist yet**; create it. No direct API calls from components/routes.

## Translatable fields (what to wire through translation)

- `prep_items`: `name`, `description`, `default_unit` / `par_unit`
- `prep_list_entries`: `unit`, `notes` (builder "instructions for cook"), `cook_note`
- **Units include restaurant-defined custom units** (`restaurant_units.label`) — translated at
  runtime, not in the fixed glossary.
- Quantities (locale-appropriate formatting).
- Recipes come later in the build order (text first, then photo ingestion).

## Hard prerequisites (do these before Phase 3 ships content)

1. **Tighten `translations` RLS.** It's currently `USING (true)` for any authenticated user
   (read/write any restaurant's translations). The table is keyed only by `entity_id` (no
   `restaurant_id`), so isolation needs either a new `restaurant_id` column on `translations`
   + a restaurant-isolation policy, or a join-based policy. **Must be done before the table
   holds real content.** See [database.md](database.md) "Known gap" + the round-2/3 security
   reviews.
2. **Human-validate the glossary.** Elijah doesn't speak Spanish; per [overview.md](overview.md)
   open question #2, run the ~10 representative phrases in
   [translation-validation.md](translation-validation.md) past a Spanish-speaking reviewer
   **before** locking the translation prompts/build.

## Suggested build order (from overview.md)

1. `lib/ai/` scaffolding — Claude client (Vercel AI SDK), prompt caching, glossary injection,
   a `translate(text, source, target, glossary)` primitive.
2. Translate item names / units / quantities / notes — lazy read-through the `translations`
   cache, with invalidate-on-edit (delete cached rows when source text changes).
3. Wire the per-user language toggle (`profiles.preferred_language`) through the read paths so
   each viewer sees their language.
4. Override UI — a user can correct a translation → writes `glossary_overrides` → future
   prompts honor it.

## Conventions / gotchas (carried from Phases 1–2)

- **DB connection**: `DATABASE_URL` must be the Supabase **pooler** host
  (`...pooler.supabase.com`, session mode :5432). The direct host (`db.<ref>.supabase.co`) is
  IPv6-only and unreachable on IPv4 networks. (When deploying to Vercel/serverless, switch to
  the transaction pooler :6543 + `prepare: false` in [db/index.ts](../src/lib/db/index.ts).)
- **Migrations**: edit `schema.ts` → `npx drizzle-kit generate` → review → apply via
  `DATABASE_URL`. RLS for new tables is hand-written in `supabase/*.sql` (one file per
  feature; pointer list at the top of `rls_and_triggers.sql`). RLS on **every** table.
- **Architecture**: LLM calls → `lib/ai/`; DB access → `lib/db/`; mutations → server actions;
  server components by default.
- **Test accounts**: [test-accounts.md](test-accounts.md) (builder + cook in two restaurants;
  shared password there). Ask the user / use the Supabase admin API to reset or seed more.
- **Branch/commit style**: feature branch `feat/<name>`; plain capitalized commit subjects,
  **no `Co-Authored-By` trailer**.
