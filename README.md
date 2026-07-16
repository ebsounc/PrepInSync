# PrepInSync

A mobile-first, **bilingual kitchen prep tool**. A chef builds prep lists and recipes; every
cook reads and works them in their own language — **English or kitchen-accurate Spanish** —
so back-of-house staff who don't share a language can still work off the same list.

> **A personal project.** A complete, working app built solo — designed like a real product a kitchen
> could actually run on, but it's a **personal project: not for sale and not commercially maintained**.
> It's here to look at and run.

---

## What it does

- **Bilingual by design (the whole point).** User content — item names, notes, units, recipes —
  is translated on demand between English and Spanish and cached, using a kitchen-specific glossary
  so the output is what a working prep cook would actually say. The entire UI is bilingual too.
- **Prep workflow.** Management builds prep lists from an item catalog (quantities, units, priority
  stars, per-item instructions); all staff tap items complete; cooks leave their own notes.
- **Recipes** attached to items — typed, pasted from a document (parsed by AI), or **scanned from a
  photo** of a binder page (AI vision).
- **Roles & permissions.** Eight roles across a management / execution split, per-person
  list-creation permission, team invites, soft-delete.
- **Graceful offline.** Check items off in a walk-in with no signal; they sync when it returns.
- **Per-user theming** (light / dark / system + accent color, cross-device) and an accent-driven logo.

The full, honest catalog of features and the decisions behind them lives in
**[docs/features.md](docs/features.md)**.

## See it live — no setup

**The easiest way to look at it is the hosted demo. Just open the link and sign in — nothing to
install.**

### ▶︎ [prepinsync.vercel.app](https://prepinsync.vercel.app)

| | |
|---|---|
| **Email** | `demo@prepinsync.app` |
| **Password** | `DemoKitchen1!` |

You land in **Demo Kitchen** — a steakhouse with real prep lists, recipes, cover photos, and a full
roster of staff across every role. Browse the lists and recipes, **flip the whole app between English
and Spanish** (in Settings, or sign in as one of the Spanish-speaking cooks), check items off, and
leave notes. It's a shared sandbox restaurant, isolated from any real data and **reset every time
someone signs in** — so anything you touch is wiped clean for the next visitor, and team management
(invites, role changes) is turned off.

Want your own? **Create your own kitchen** from the login screen spins up a fresh, private restaurant.

## Tech stack

- **Next.js 15** (App Router, React 19, server actions) + **TypeScript** (strict)
- **Supabase** — Postgres, auth, storage, row-level security
- **Drizzle ORM** for type-safe queries
- **Tailwind CSS** + shadcn / Base UI components
- **Vercel AI SDK + Claude (Sonnet 4.6)** for translation and recipe parsing/vision
- **Vercel** for hosting

## Running it yourself (optional — for developers)

You don't need any of this to *see* the app — use the [hosted demo](#see-it-live--no-setup) above.
These steps are only if you want to clone the repo and run your **own** copy of the code. Because it's
a full-stack app with its own database, that means bringing your own backend — there's no way around it.

**Prerequisites:** Node 20+, a [Supabase](https://supabase.com) project, and an
[Anthropic API key](https://console.anthropic.com).

1. **Install**
   ```bash
   npm install
   ```

2. **Environment** — copy the template and fill in your values (`.env.local` is gitignored):
   ```bash
   cp .env.example .env.local
   ```
   | Variable | Where to get it |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API |
   | `DATABASE_URL` | Supabase connection string — **use the pooler host** (`...pooler.supabase.com`); the direct host is IPv6-only and won't connect on many networks |
   | `ANTHROPIC_API_KEY` | Anthropic Console |

3. **Set up the database.** In your Supabase project's SQL editor, run
   **[`supabase/setup.sql`](supabase/setup.sql)** once — it creates every table, constraint, RLS
   policy, the signup trigger, and the Storage bucket in a single shot.

   (That file is the flattened *current* schema. The per-change history lives in
   [`drizzle/migrations/`](drizzle/migrations) + [`supabase/`](supabase), and the workflow for
   *changing* the schema later is in [docs/database.md](docs/database.md) — don't use `drizzle-kit push`.)

4. **Run**
   ```bash
   npm run dev
   ```
   Open <http://localhost:3000>. It's mobile-first — try your browser's device emulation, or a phone
   on the same network.

## Docs

- **[docs/features.md](docs/features.md)** — full feature catalog + the intentional choices behind it
- [docs/overview.md](docs/overview.md) — product scope, build phases, stack, roadmap
- [docs/database.md](docs/database.md) — schema map, migration workflow, RLS model
- [docs/i18n.md](docs/i18n.md) — how the static UI is translated (separate from content translation)
- [docs/translation-validation.md](docs/translation-validation.md) — the kitchen-Spanish glossary
