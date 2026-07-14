# PrepInSync — feature catalog

The living catalog of what the app **actually does**, and the deliberate choices behind it.
A lot of the work here is invisible at a glance (the translation cache, the offline queue,
the tenant isolation) — this doc gives it a home so it gets credit and so we remember why it
exists. **Rule going forward: a feature isn't done until it's listed here**, updated in the
same commit as the feature.

Scope: **shipped, live features only** (no roadmap / v2). Written 2026-07-14.
Product = a mobile-first, bilingual (English ↔ Spanish) back-of-house kitchen prep tool.
Stack + architecture live in `docs/overview.md` and `docs/database.md`; this is the *what*.

---

## 1. Accounts & authentication

- **Email/password signup, login, logout, forgot-password, and password reset.**
- **Signup** collects first name, last name, email, password, and a **language choice**. Name +
  language flow through Supabase auth metadata into a `profiles` row created by a DB trigger on
  signup (`handle_new_user`, `SECURITY DEFINER`).
- **One account = one restaurant.** The restaurant is the tenant boundary; a new signup starts
  un-onboarded (`restaurant_id` NULL).
- **Owner onboarding** — the first user creates the restaurant (name + timezone) and, in one
  transaction, becomes its **owner** with list-creation permission.
- **Invite-based joining** for everyone else (below).
- **User-enumeration protection (intentional):** signup and login never reveal whether an email
  is already registered (generic error), and forgot-password always returns success regardless of
  whether the address exists.
- **Auth is verified server-side on every authenticated route and every mutation** — never trusted
  from the client. Middleware refreshes the Supabase session on each request; layouts enforce the
  redirects.

## 2. Roles, ranks & permissions

- **Eight roles across two tiers:**
  - **Management** — `owner`, `general_manager`, `kitchen_manager`, `head_chef`, `sous_chef`.
  - **Execution** — `prep_chef`, `line_cook`, `expeditor`.
- **`can_create_lists` permission flag**, independent of role: defaults **true** for management,
  **false** for execution, and is **toggleable per person** by any management-tier user. This is
  what lets, say, a trusted prep chef build lists without a role change.
- **Localized role labels** (English/Spanish) throughout the UI.
- **Owner is singular and protected:** exactly one owner per restaurant (enforced by a partial
  unique DB index, so a concurrent double-transfer can't create two). The owner can't be assigned
  via invite, can't have their role/permission changed, and can't be deactivated.
- **Ownership transfer** — the owner can hand the role to another active member; the old owner
  steps down to General Manager. Atomic (demotion first, so the one-owner index is never violated),
  and owner-only.
- **Role is independent of language** — any user of any role reads/writes in their own language.

## 3. Team management (management-only)

- **Invite a member** by email + name + role. The invite is recorded server-side and Supabase sends
  the invite email; the invitee sets a password and lands in the app.
  - **Trust boundary (intentional):** an invited user's restaurant, role, and permission are read
    from the server-side **invite row** on acceptance — **never** from user-editable auth metadata.
    Only display-only name + a default language go in metadata.
  - Invitee defaults to the **inviter's language** (the restaurant's working language is a better
    guess than always English); they can change it later.
- **Roster management** per member:
  - **Change role** — resets `can_create_lists` to the new role's default so a demotion never leaves
    stray list access behind.
  - **Grant / revoke list-creation** individually.
  - **Deactivate / reactivate** (soft-delete, below).
- **Guard rails:** you can't change the owner's role/permission, can't change *your own* role or
  permission (no locking yourself out), and can't deactivate yourself or the owner.
- **Soft-delete for members (`is_active`):** a deactivated member is **locked out of the entire app**
  (a dead-end screen with only sign-out; server actions also reject them), but all their **historical
  data survives** — their completions and notes stay attached. Nobody is ever hard-deleted.

## 4. Prep item catalog

- **Item database** per restaurant: each item has a **name**, an optional **description** (storage
  location / special instructions), and an optional **thumbnail photo**.
- **Two distinct amount pairs** (a deliberate distinction, easy to conflate):
  - **Default amount** (quantity + unit) — the batch amount that **prefills** a prep-list entry when
    the item is picked (still editable on the list).
  - **Par level** (quantity + unit) — the target stock to keep on hand; informational.
- **Decimal quantities** (e.g. `1.5 quarts`), stored as `numeric`. Display trims trailing zeros, and
  a **quantity-less** amount (e.g. "salt to taste") renders as blank — **not** "0".
- **Searchable item list** with a filter field that matches both the **translated (displayed) name
  and the source-language name**, diacritic-insensitive ("jalapeno" finds "jalapeño").
- **Inline add/edit**; a new item can carry an **inline recipe** created in the same step.

## 5. Units of measure

- **14 built-in units** (`lb, kg, oz, g, qt, L, gal, pint, case, tray, container, bag, bunch, each`),
  **pluralized for display** ("2 lbs"), with **hand-curated Spanish forms** — built-in units are
  translated from a static table and **never** hit the LLM. Metric abbreviations (kg, g, L) are the
  same in both languages; "each" → "c/u".
- **Custom restaurant-defined units** (e.g. "lexan", "6-pan") — added inline from the item/list forms,
  saved for reuse, and (because they can't live in the fixed glossary) **translated at runtime** via
  the content-translation cache.
- Units are stored as **free text** on items and entries; writes are validated against the built-in
  set + the restaurant's custom units.
- A **unit picker** with inline "add a unit," optional clear, big touch targets.

## 6. Prep lists & the prep workflow

**Building a list (management with `can_create_lists`):**
- Create a list with a **title + date**, then add entries: pick an item, set quantity/unit, optionally
  **star** it as priority, optionally attach **instructions for the cook**.
- **Searchable item picker (combobox)** — same dual-name, diacritic-insensitive matching as the item
  catalog, so a cook can find an item by the name they heard in the other language.
- **Prefill** — picking an item fills quantity/unit from its default amount (still editable).
- **Duplicate-entry confirmation** — adding an item already on the list prompts "already on the list —
  add again?" before creating a second entry.
- **Smart new-list defaults:** the default date is computed **in the restaurant's timezone**, defaulting
  to today or the next day per a restaurant setting; the title field suggests a friendly hint like
  "Friday a.m. prep" (weekday from the target day, a.m./p.m. from the current time).
- List **title and date are editable** after creation; entries can be edited or removed; deleting a list
  cascades its entries.

**Working a list (all staff):**
- Everyone sees the **full list**; **starred priority items float to the top**.
- **Tap to complete** — the whole left region of a row is the toggle (a big, greasy-hands target).
  The checkbox flips **optimistically** (instant), then persists.
- **Completion is attributed** — who + when are recorded, shown as "Done by {name}".
- **Cook notes** — any staffer can leave a note on an entry ("only half a case left"). It's stored
  **separately from the builder's instructions** so neither overwrites the other, is **attributed** to
  whoever wrote it ("Your note" / "<Name>'s note"), and carries its own source language so it translates
  independently.
- **Progress feedback** — a progress bar, an "X/Y done" count, and an "All done" state.
- **Completion status updates on refresh / navigation** (server revalidation after each action) — a
  manager sees cooks' checkmarks the next time the page loads, not pushed live.

## 7. Home dashboard

- **Time-of-day greeting** — "Good morning / afternoon / evening, {name}", computed from the current
  hour **in the restaurant's timezone**.
- Today's date, localized ("Thursday, June 4" / "jueves, 4 de junio"); dates are parsed as UTC so the
  displayed day never shifts with the server's timezone.
- A **read-only preview of today's prep lists** with a checklist preview, and a shortcut to create a
  new list (only shown to users who can).
- **One batched translation call for the whole dashboard (intentional):** every entry across all of
  today's lists is translated in a **single** LLM round-trip on a cold cache, not one call per list.

## 8. Bilingual UI — app chrome (static i18n)

- **The entire interface is bilingual, not just user content.** App chrome — nav, buttons, labels,
  headings, placeholders, dates, role labels, and even server-action error/validation messages — comes
  from a **hand-rolled, type-checked English/Spanish dictionary** (no i18n library, to keep the client
  bundle small for low-end Android).
- **Type safety:** English is the source of truth; the Spanish dictionary is typed against it, so the
  build **fails** if any key is missing or renamed. (Spanish *wording* is human-validated separately;
  the *structure* is enforced by the compiler.)
- **Neither dictionary ships in the client JS bundle** — only the one active, resolved dictionary
  travels to the browser (via the RSC payload), keeping the payload small.
- **Language is per-user** (`profiles.preferred_language`); logged-out pages use a `lang` cookie
  (default English), written on signup/login/settings-change so it converges to the real preference.
- **Localized validation errors** — Zod messages carry a dictionary key resolved into the user's
  language on return, with the client contract unchanged.
- Adding a third language is structured as a one-file addition (dictionary + locale + DB constraint).

## 9. Content translation — the bilingual wedge

The defensible core: kitchen-accurate translation of **user-authored content** so back-of-house staff
who don't share a language work off the same list.

- **Per-user, bidirectional (English ↔ Spanish).** Content is authored in one language (whatever the
  writer used) and shown to each viewer in **their** language. A Spanish-speaking chef can author in
  Spanish; an English-reading cook sees it in English, and vice versa.
- **Translates** item names, descriptions, units (including custom units), list titles, builder
  instructions, cook notes, and full recipes; numbers/measurements are preserved.
- **Lazy translation + cache** — content stays in its source language until someone requests the other
  language; the first request translates once and stores it; later requests read the stored copy.
  Nothing is pre-translated.
- **Automatic staleness detection** — each cached translation stores an **MD5 hash of the source text**.
  On read, a matching hash is a cache hit; a changed source re-translates just that field. So editing
  source text invalidates its translation with no explicit bookkeeping.
- **Kitchen glossary** injected into every translation prompt (Claude Sonnet 4.6) so output is what a
  working prep cook would actually say ("walk-in cooler" → "cuarto frío", "fold" → "incorporar
  suavemente"), not dictionary-literal.
- **Translation corrections that feed back into the glossary** — any viewer can fix a wrong translation
  on the page; the correction is saved as a **restaurant glossary override** (improving all future
  translations for that restaurant) and the affected cached translation regenerates. Re-correcting a
  term replaces the prior preference.
- **Reliability engineering (invisible but load-bearing):**
  - **Batched** — a whole page's fields translate in one call; the dashboard batches across all lists.
  - **Chunked & parallel** — big entities (a full recipe = 30+ fields) are split into ≤10-field chunks
    run in parallel, so no single call overruns its timeout and fails wholesale; chunks cache
    independently.
  - **Graceful failure** — on any LLM error/timeout a field falls back to its **source text** and
    **nothing is persisted**, so it silently retries on the next render. A cook never sees a blank or
    an error.
  - **Prompt caching** — the large, stable glossary is a cacheable system-prompt prefix; per-restaurant
    overrides are a separate, smaller segment. Keeps long-run API cost low.
- **Tenant-isolated cache** — translations are keyed and row-secured per restaurant, so one restaurant's
  cached (or corrected) translations never leak into another's.

## 10. Recipes

- **Optional, one recipe per prep item.** Management authors/edits; **any active member can view** —
  the "recipes in your language" cook path.
- **Manual structured editor** — dynamic ingredient rows (name + quantity + free-text unit) and ordered
  steps.
- **Paste-from-document** — paste raw recipe text (Word/Google Doc/email/notes) and Claude structures it
  into ingredients + steps to review, edit, and save. Parsing **keeps the author's language** (it does
  not translate — the glossary is deliberately not injected for parsing).
- **Photo ingestion** — "Scan a photo": snap a binder page / recipe card / handwritten note and Claude's
  vision extracts the same structured ingredients + steps into the same review flow. **The photo is used
  inline and never stored.**
- **Recipe units are free text** (cup/tbsp/clove) — intentionally *not* validated against the unit
  allow-list and *not* added to the restaurant's custom units, since pasted recipes use their own words.
- **Full translation** — ingredient names, free-text units, and step text translate lazily per viewer,
  and are individually correctable.
- **Cook entry points** — a recipe link on each item and on each prep-list entry whose item has a recipe.
- **Recipe cover photo** and **prep-item thumbnail** persist to Storage (below).
- Deleting an item cascades its recipe (no orphaned recipe rows).

## 11. Images & storage

- **Private Supabase Storage bucket**, tenant-isolated **by path** (`{restaurantId}/…`), with RLS keyed
  on the first path segment — the same isolation model as every table. No public buckets.
- **The DB stores the object *path*, not a URL** — signed URLs expire, so display code generates a
  short-lived **signed URL** at render time (1-hour TTL). The browser is never handed a raw path.
- **HEIC normalization (intentional):** every image is **downscaled and re-encoded to JPEG client-side**
  before any upload or scan. This shrinks payloads *and* fixes iPhone **HEIC** photos — the browser
  decodes HEIC and emits JPEG, so the server never sees a format it can't handle.
- Server validates image type + size; all Storage mutations go through a service-role admin client
  (bypassing RLS, which stands as defense-in-depth); orphan cleanup on delete is best-effort.

## 12. Appearance & theming (per-user)

- **Per-user theme** — Light / Dark / **System** — and a **switchable accent color** (8 presets plus a
  custom color picker), persisted to the profile so they **follow the user across devices**, not just
  the browser.
- **Applied server-side on first paint** via a cookie mirror, so there's **no flash** of the wrong theme
  on load; `localStorage` is only the logged-out fallback.
- **The logo and accent follow the chosen color live.**
- **Security (intentional):** the accent value is validated against a strict allow-list (known preset
  colors or a `#rrggbb` hex) on both write and read, because it lands in a server-rendered `style`
  attribute — closing a CSS-injection vector. Appearance cookies are seeded/cleared across every session
  transition (login, invite/recovery, logout) so a shared device never carries one user's theme into
  another's session.

## 13. Graceful offline (dead zones)

For a cook in a walk-in cooler with no signal:
- **Optimistic completions** — checking an item off flips instantly whether or not there's signal.
- **Offline queue** — with no connection, the completion is stored in a per-device queue and **replays
  automatically when the connection returns**. An offline banner shows the state.
- **Correctness details (intentional):**
  - Queued completions are **bound to the user who made them** — a different user signing in on a shared
    device never syncs someone else's checks under their own name.
  - The completion action is **absolute and idempotent** (set, not toggle) and carries the **real
    check-off time**, so replaying it twice is a no-op and the record shows when the item was actually
    done, not when it synced.
  - Reconnect drains **coalesce** across connectivity flaps; a completion whose entry was since deleted is
    dropped without crashing (last-write-wins); rapid online taps are serialized to avoid races.
- This is graceful degradation, **not** full offline mode — there's no local database or offline
  page-reload; it targets dead zones while the app is open.

## 14. Branding & mobile UX

- **PrepInSync** — Sora typeface, a green accent (user-switchable, §12), light/dark.
- **Logo** — an outline clipboard with a check, drawn as inline SVG so it **recolors to the user's
  accent**; also the browser-tab favicon (fixed brand green).
- **Mobile-first, greasy-hands UX** — big touch targets (44–56px+), readable on small/cheap screens,
  designed for **low-end Android**, not just iPhone. Client bundles are kept deliberately small (no
  heavy client libraries, dictionaries kept off the bundle).
- Persistent app shell: sticky top bar with the brand, a bottom tab bar (Home / Lists / Items / Team —
  Team shown only to management), and the offline banner.

## 15. Security & architecture (cross-cutting, all intentional)

- **Row-level security on every table** (10+ tables); one account = one restaurant, and every
  tenant-scoped row is isolated by `restaurant_id`.
- **Server actions for all mutations; server components by default** — the browser has **no direct
  database access** (DB modules are `server-only`), so tenant checks can't be bypassed client-side.
- **Authorization is enforced in application code** on the server (the app connects as the table owner and
  bypasses RLS for speed; RLS is the defense-in-depth backstop for any direct client read).
- **Enum domains enforced twice** — TypeScript narrows the type at compile time *and* DB `CHECK`
  constraints reject invalid values at write time (roles, languages, themes, list-day, source languages).
- **Trusted data comes from server-side records, not user metadata** — invite acceptance reads
  restaurant/role/permission from the invite row, never from the editable auth metadata.
- **No secrets in code** — env vars for dev and prod; `.env.local` gitignored.

---

*Keep this current. When you ship or change a feature, update the matching section in the same commit.*
