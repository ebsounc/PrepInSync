# Kitchen prep app — overview

Internal reference for Elijah + Clark. Working doc.

---

## What it is

A mobile-first kitchen prep tool that bridges language gaps in the kitchen. Each user picks their language; the app translates prep lists and recipes between them so a chef and a prep cook who don't share a language can still work off the same list. English ↔ Spanish in v1, kitchen-accurate.

## The wedge

Bilingual is the spine of the product. The plain digital prep-list app already exists (FusionPrep, MaintainIQ, Prep List, Operandio) — which proves restaurants pay for this category. None of them bridge the language gap for back-of-house staff. That's the gap we build into.

Each user reads and writes in their preferred language. Content is authored in one language and seen by others in theirs. Translation is kitchen-specific — handles cuts of meat, prep techniques (brunoise, chiffonade, julienne), equipment names, par-level phrasing.

Note on competitive landscape: restaurant-Spanish tools exist (RestauNax, Bojangles' ordering AI), but they're all **customer-facing** — helping Spanish-speaking guests order. We're the only one doing **staff-facing**, back-of-house, prep-focused translation.

## The defensible part

Kitchen Spanish ≠ Google Translate Spanish. The core moat is a domain-specific translation layer accurate enough that prep cooks trust it. Generic translation produces output a real cook wouldn't follow. Defensibility lives in translation quality, not in being first to Spanish — incumbents could bolt translation on; they couldn't easily match kitchen-accurate quality.

## Roles

Roles govern *permissions and workflow*, not language. Language is a separate per-user setting.

Eight roles, two tiers:

**Management tier** (`owner`, `general_manager`, `kitchen_manager`, `head_chef`, `sous_chef`) — can build prep lists by default. Can grant or revoke list-creation permission for individuals in the execution tier.

**Execution tier** (`prep_chef`, `line_cook`, `expeditor`) — receive and work through prep lists by default. Can be granted list-creation permission individually by anyone in the management tier. Expeditor coordinates between kitchen and front-of-house and reads prep lists but doesn't create them.

Permission model: `profiles.can_create_lists` boolean, defaulting to `true` for management roles and `false` for execution roles at insert time. Management tier can toggle it per person.

The hard part isn't whether the chef finds it useful. It's adoption — see open questions.

## Hardware constraints (shape the build)

- **Must work on low-end Android, not just iPhone.** Kitchen staff often don't have iPhones — Android-first thinking, no Apple-only features.
- **Must tolerate bad connectivity.** Walk-in coolers, basements, dead zones. Should degrade gracefully — see "graceful offline" in v1 scope below.
- **Greasy-hands UX.** Big touch targets, simple interactions, readable on small/cheap screens.
- Phone-first; tablet/iPad should also work.

---

## v1 scope (must ship)

**Auth & account setup**
- Signup, login, password reset
- One account = one restaurant location
- Management tier invites team members; manages roster
- Eight roles across two tiers — management (owner, general_manager, kitchen_manager, head_chef, sous_chef) and execution (prep_chef, line_cook, expeditor)
- `can_create_lists` permission flag: true by default for management, false for execution, toggleable per person by management

**Prep workflow**
- Item database (restaurant inputs their prep items, with an optional **default amount**, an optional **par level** (target stock), and a description for storage/special instructions)
- Quantities support decimals (e.g. 1.5 quarts) — stored as `numeric`
- Units of measure handled correctly (lbs/kg, oz/g, quarts/liters, cases, trays, each), pluralized for display ("2 lbs"). Restaurants can add their own **custom units** (saved for reuse)
- Management builds the prep list — selects items (quantity/unit prefill from the item's default amount, still editable; a confirm guards adding the same item twice), sets quantities, optionally stars priority items (starred items float to top), and can attach **instructions for the cook**. List name/date are editable after creation
- All staff see the full list; tap items to mark complete; a cook can leave their own **cook note** (separate from the instructions, attributed to whoever wrote it)
- Real-time completion status visible to management; Home shows a read-only preview of today's lists
- Soft-delete for team members (`is_active` flag) — historical completion data is preserved; a deactivated member is locked out of the app entirely. Management can change a member's role
- Management can edit restaurant info (name, timezone, and when lists are typically built) and manage custom units on a **Settings** page

**Recipes (optional per item)**
- Items can have an attached recipe or not — supports both "experienced staff, no recipes needed" and "newer staff, recipes required" use cases
- Manual recipe entry (typed)
- Recipe paste-from-document (Word, Google Docs, etc.) — parsed via LLM into structured form
- Photo recipe ingestion — snap a binder page, OCR + LLM structures it into ingredients + amounts + instructions, chef reviews and saves
- Each recipe has an optional cover photo (shown above the recipe view)
- Each prep item has an optional thumbnail image (shown in list views)
- `instructions` is a JSONB array of steps: `{ text?: string, imageUrl?: string }[]`. A step can be text-only, image-only (e.g. a photo of a handwritten recipe), or both. Per-step images are already modeled; v2 can expose the UI for it.

**Bilingual core**
- Language is a **per-user preference**, not fixed by role. Each user (chef or prep cook) picks the language they read/write in.
- **The entire UI is bilingual, not just user content.** Two layers: (1) **app chrome** — nav, buttons, labels, headings, dates, role labels, error messages — comes from a static hand-rolled `lib/i18n` dictionary (en/es), no LLM; (2) **user-authored content** — item names, notes, units — is LLM-translated and cached (below). Language is driven by `profiles.preferred_language` when logged in, and a `lang` cookie (default English) on the logged-out auth pages. Architecture in `docs/i18n.md`.
- Translation is **bidirectional** (English ↔ Spanish in v1). Content has a source language (whatever it was authored in); each viewer sees it in their preferred language.
- Most input will be English in practice, but a Spanish-speaking chef can author in Spanish and an English-reading prep cook sees it in English. Not everyone in a kitchen is Spanish-speaking.
- Translate item names, descriptions, units (including restaurant-defined custom units), quantities, recipes, the builder's instructions, and cook notes.
- **Lazy translation + cache:** content stays in its source language until someone requests the other language. On first request, translate once and store it; future requests read the stored copy. Don't pre-translate everything — only translate what's actually read.
- Store translations in a flexible translations table keyed by (content, target language), NOT as fixed English/Spanish columns. This keeps adding languages later (v2) clean.
- When source text is edited, invalidate its cached translations so they regenerate on next request.

**Notes & comments**
- The builder can attach a prep note (instructions) to a list item; the cook sees it read-only
- Prep cook can leave their own note on an item ("we're out of cilantro", "only half a case left") — stored separately so it never overwrites the prep note
- Chef sees notes in real time

**Graceful offline tolerance** *(not full offline mode)*
- Reads are cached — list remains viewable without signal
- Prep cook can check off items with no signal; checks sync when connection returns
- This is NOT a full local-database + conflict-resolution architecture (that's v2 if ever needed). Just handles dead zones.

## v2 (after v1 is stable and we have real users)

- Assigned-to per prep list entry (prep cook sees only their tasks)
- Sort order for prep list entries (chef manually reorders the list)
- Draft/scheduled publish for prep lists (build the list, release it at a set time)
- Voice entry for recipes (chef talks, app structures it)
- Recurring/template prep lists (Mon–Fri auto-populate)
- Prep history & reports (how long things took, what got skipped, trends)
- Multiple stations per kitchen (sauté, grill, cold, fry — each with its own list)
- Multiple locations per account (chain support)
- AI chatbot for kitchen advice
- Full offline mode (local DB, conflict resolution) — only if graceful-offline isn't enough
- Languages beyond Spanish
- Regional Spanish modes — chef picks during onboarding (Neutral Latin American, Mexican-style, Spanglish with English kitchen terms, etc.) and the whole app translates accordingly. Differentiator vs. any incumbent who bolts on one-size-fits-all translation.

## v3 (if ever)

- Inventory tracking
- Allergen flags on recipes (gluten/dairy/nut)
- Task-completion photos — not a priority by design. If a prep cook checks the box, the work is done. Adding photo verification turns the product into a surveillance tool, which prep cooks would resent.

---

## Onboarding & sales framing

The product ships with full functionality, but the *sales motion* meets restaurants where they are:

- **Experienced-staff pitch:** "Start light — just enter your items and quantities. Your cooks already know the recipes. Add them later as a training tool when you need it." Onboarding feels like minutes.
- **High-turnover / newer-staff pitch:** "Load your recipes in once — snap photos of your binder if you have one — and your cooks always have what they need, in their language." Heavier onboarding, but solves a sharper pain.

Same product, two narratives depending on the buyer's pain.

For first 5-10 paying customers: **white-glove onboarding.** Elijah personally helps them get set up, however long it takes. Standard practice for early B2B SaaS; doesn't scale forever but pays off enormously for first customers.

---

## Open questions

1. **Adoption is the real risk.** The product being useful is not in doubt. Convincing stingy, set-in-their-ways restaurants to switch is. Translation pre-test happens before/during build; adoption gets answered by actually pitching to real restaurants once v1 is shippable.
2. **Translation accuracy.** Elijah doesn't speak Spanish, so output can't be self-verified. Concrete test: ~10 representative prep phrases through an LLM, checked by a Spanish-speaking former coworker. Do this before locking the build. Scope is smaller than first thought because prep vocabulary lacks service slang.

---

## Realistic timeline

This is Elijah's summer project. Target window: **6–10 weeks** of focused work for v1.

Suggested build order (each phase depends on the previous):

1. **Foundation** (week 1-2): stack decision, auth, account setup, role-based views, basic CRUD for items and prep lists. Boring but load-bearing.
2. **Core workflow** (week 2-3): chef builds list → prep cook sees list → marks complete → chef sees status. End-to-end in English first.
3. **Translation layer** (week 3-4): wire in LLM translation for items, units, notes. This is when the translation pre-test pays off — you'll be plugging tested phrases into a real flow.
4. **Recipes — text first** (week 4-5): manual entry, paste-from-document. Translation pipeline already exists; recipes just feed into it.
5. **Recipes — photo ingestion** (week 5-6): OCR + LLM parsing for binder photos. Built last in v1 because (a) the rest of the app teaches you what shape recipe data needs to land in, and (b) if this is harder than expected, you have a working product to ship.
6. **Polish & graceful offline** (week 6-7): handle dead zones, polish UX, edge cases.

Buffer for the unexpected: the realistic finish line is 8-10 weeks of focused work, not 6. Plan for 10 and feel like a winner at 8.

The build phase is going to feel like home turf. Discipline to maintain: ship v1 *before* adding v2 features. Scope creep mid-build is what kills student projects.

---

## What's NOT in this doc yet

- Pricing.
- Naming.
- Marketing / go-to-market plan beyond white-glove for first customers.

Each of these gets its own decision moment — none of them block starting the build.

---

## Stack (locked)

- **Next.js 15 + TypeScript** — full-stack React, server actions for backend logic, fast deploy via Vercel.
- **Supabase** — Postgres + auth + storage + row-level security in one box.
- **Tailwind CSS + shadcn/ui** — mobile-first styling and accessible touch-friendly components.
- **Vercel AI SDK + Claude API** — unified LLM interface with streaming and structured outputs. Sonnet 4.6 for translation and recipe parsing.
- **Vercel** for hosting — auto-deploys from GitHub, preview URLs per PR.
- **Stripe** for billing (added when needed, not now).
- **Drizzle ORM** on top of Supabase for type-safe queries.

### Cross-device compatibility

The whole stack is **web-based** — one codebase that runs in any modern browser on Android, iOS, and desktop. No separate native apps. Mobile-first design via Tailwind; touch-friendly components via shadcn/ui.

Things to actively test for as we build:
- **Low-end Android performance** — keep bundles small, avoid heavy client-side libraries.
- **Safari quirks** on iOS — historically the most stubborn browser.
- **Camera access** for photo recipe ingestion — works in all mobile browsers via `<input type="file">` but UX differs slightly between iOS and Android.

Discipline: test on a real low-end Android device periodically during build, not just desktop browser emulation. Emulators lie.

### AI/LLM integration

Vercel AI SDK + Claude API handles all of:
- **Translation (v1 core)** — bidirectional English ↔ Spanish, kitchen-accurate, with glossary injection for consistency. Lazy: translate on first request for a given language, cache the result, invalidate on source edit.
- **Photo recipe ingestion (v1 core)** — Claude's vision capability extracts ingredients/amounts/instructions from a binder photo into structured JSON.
- **Recipe paste parsing (v1 core)** — same LLM pipeline, different input format.
- **Chatbot (v2)** — streaming + tool calling infrastructure already in place from v1.

API cost expectation at early scale: roughly $5-20/month for the first dozen restaurants. Caching common phrases (via glossary) keeps long-run cost low.