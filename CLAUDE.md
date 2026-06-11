# Kitchen prep app — project rules

Bilingual-first kitchen prep tool. Each user picks their language; the app translates prep lists and recipes between them (English ↔ Spanish in v1) so kitchen staff who don't share a language can work off the same list.

Eight roles, two tiers. Management (`owner`, `general_manager`, `kitchen_manager`, `head_chef`, `sous_chef`) can create prep lists by default. Execution (`prep_chef`, `line_cook`, `expeditor`) cannot by default, but management can grant `can_create_lists` per individual. Language is independent of role — any user can pick English or Spanish.

## Required reading at session start
Read these before working:
- `docs/overview.md` — product scope, v1 features, version roadmap, stack, constraints
- `docs/translation-validation.md` — kitchen Spanish glossary and translation approach

## Stack
- Next.js 15 (App Router) + TypeScript (strict mode)
- Supabase — Postgres, auth, storage, row-level security
- Drizzle ORM for type-safe queries
- Tailwind CSS + shadcn/ui
- Vercel AI SDK + Claude API (Sonnet 4.6) for translation and recipe parsing
- Vercel for hosting
- Stripe for billing (NOT yet — only when we reach billing)

## Architecture rules
- All LLM calls go through `lib/ai/`. No direct API calls from components or routes.
- All database access goes through `lib/db/`. No raw queries scattered in route handlers.
- Server actions for mutations. Server components by default; client components only when interactivity requires it.
- Row-level security on EVERY table. No exceptions. One account = one restaurant; users only see their restaurant's data.
- Each feature area is self-contained where possible.
- Before changing the database, read `docs/database.md` — the DB map (Drizzle vs. raw-SQL split, migration workflow, RLS model per table).

## Internationalization (UI strings) — distinct from the content-translation layer below
- **Two separate systems.** The **translation rules** below govern user-authored *content* (item names, notes, units) via the LLM cache. This section governs the **static app chrome** (nav, buttons, labels, headings, placeholders, dates, role labels, server-action error/validation messages) via a hand-rolled dictionary. Don't conflate them.
- **Never hardcode user-facing display text** in components or actions. Every string goes through `lib/i18n` dictionaries. Add each new string to **both** `lib/i18n/en.ts` and `lib/i18n/es.ts` — `type Dict = typeof en` makes the build fail if `es` is missing a key.
- Server components/actions/format use `getDictionary(lang)`; client components use `useT()` from `lib/i18n/client`. Parameterized strings use `{token}` placeholders + `interpolate()`.
- The active dictionary is provided to client code via `LanguageProvider` (so neither full dictionary enters the client JS bundle — keep it that way). Logged-in language = `profiles.preferred_language`; logged-out pages use the `lang` cookie (default `en`), set on signup/login/settings-change.
- Server-action error/validation messages: Zod messages carry a dotted dictionary KEY (e.g. `'errors.items.nameRequired'`) resolved via `resolveKey(dict, …)` on return; the `{ error: string }` contract to client render sites is unchanged.
- Full architecture + "how to add a string / a language": `docs/i18n.md`.

## Translation rules
- Language is a **per-user preference**, not tied to role. Each user picks the language they read/write in. Roles govern permissions/workflow, not language.
- Translation is **bidirectional** (English ↔ Spanish in v1). Content has a source language (whatever it was authored in); each viewer sees it in their preferred language. Input is usually English but not always — a Spanish-speaking chef can author in Spanish.
- Translate item names, descriptions, units, quantities, recipes, and notes. "Units" includes restaurant-defined custom units (translated at runtime — they can't live in the fixed glossary). "Notes" means both the builder's instructions and the cook's note.
- **Lazy translation + cache:** content stays in its source language until someone requests the other language. On first request, translate once and store it; future requests read the cached copy. Do NOT pre-translate everything — only translate what's actually read.
- **Store translations in a flexible table** keyed by (content reference, target language), NOT as fixed English/Spanish columns. This keeps adding languages later (v2) clean — no schema change needed.
- **Invalidate on edit:** when source text changes, delete its cached translations so they regenerate on next request.
- Use a kitchen glossary (injected into translation prompts) for consistency. The glossary is the source of truth for preferred terms — e.g. "walk-in cooler" → "cuarto frío", "fold" → "incorporar suavemente", "sheet pan" → "charola". Glossary applies in both directions.
- Cache common translated phrases — don't re-translate the same string. Consistency matters more than fresh translations.
- A user can review/override any translation; overrides feed back into the glossary.
- See `docs/translation-validation.md` for the working glossary.

## Mobile / cross-device rules
- Mobile-first. Design for a phone in an apron pocket first, desktop second.
- Must work on low-end Android, not just iPhone. No Apple-only features.
- Keep client bundles small — low-end devices have real performance limits.
- Big touch targets, readable on small/cheap screens (greasy-hands UX).
- Graceful offline: cached reads, queued checkbox completions that sync when signal returns. NOT full offline mode in v1.
- Test on a real low-end Android periodically, not just desktop browser emulation.

## Security (non-negotiable)
- No secrets in code. Use `.env.local` for dev, Vercel env vars for prod. `.env.local` must be gitignored.
- RLS on every table (see above).
- Verify auth server-side on every authenticated route.
- Stripe webhook handlers (when added) must verify signatures.

## Workflow
- Use plan mode for any task touching multiple files or modifying the database schema.
- Read relevant code before editing it.
- Run typecheck and lint after changes.
- Migrations are never edited after being applied — always add a new one.
- When a significant decision changes (stack, convention, scope), update this file AND `docs/overview.md` immediately. Docs and code must not drift apart.

## v1 scope reminder
Build order: foundation/auth → core prep workflow (English) → translation layer → recipes (text) → recipes (photo ingestion) → polish/offline. Ship v1 before adding any v2 features. Photo recipe ingestion is built LAST in v1. See `docs/overview.md` for full detail.