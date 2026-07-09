# Phase 7 kickoff — release readiness

Internal working doc. Written 2026-07-09, right after Phase 6 (rebrand to PrepInSync + UI overhaul) merged.

---

## What Phase 7 is

The last stretch before v1 can go in front of a real restaurant. Phase 6 made the app *look* finished; Phase 7 makes it *behave* finished. Five workstreams, roughly in dependency order:

1. Theme persistence (per-user, cross-device)
2. Searchable item picker (scale)
3. Offline / dead zones
4. Logo
5. README + a living feature list

Nothing here is a v2 feature. If something starts to feel like one, it goes in `overview.md` under v2 instead.

---

## 1. Theme persistence

**Problem.** Appearance (light/dark + accent) is stored only in `localStorage` — see the comment atop `src/app/(app)/settings/_components/appearance-form.tsx`. So it survives logout on the *same* browser, but does not follow the user to another device. Pick orange on your laptop, open your phone, it's green again. Observed in testing.

**Fix.** Mirror what `preferred_language` already does:

- Add `theme` and `accent_color` to `profiles` (new migration — never edit an applied one).
- Write both on change from the settings form (server action), same shape as the language setter.
- Mirror to a cookie so the root layout can render `class="dark"` and the accent CSS var **server-side on first paint**, with no DB round-trip in `layout.tsx`. This also removes the no-flash `<script>` for logged-in users; it stays as the logged-out fallback (auth pages have no profile to read).
- `localStorage` becomes a pure logged-out fallback rather than the source of truth.

**Open question.** Accent is currently an arbitrary oklch string (the custom color picker writes any hex the OS picker returns). Storing free text in a column is fine, but it must be validated server-side before it lands in a `style` attribute — an unvalidated value there is a CSS-injection vector. Constrain to a strict `oklch(...)`/`#rrggbb` pattern on write.

**Touches:** `profiles` schema + migration, `docs/database.md`, settings action, `appearance-form.tsx`, `app/layout.tsx`, i18n keys.

---

## 2. Searchable item picker

**Problem.** `AddEntryRow` renders *every* prep item into a plain `<select>` (`src/app/(app)/prep-lists/[id]/_components/add-entry-row.tsx`). A real restaurant has hundreds of prep items. Scrolling a 300-option native select on a phone with greasy hands is not a usable interaction. The Items page has the same shape of problem, less acutely.

**Fix.** A search/filter combobox for item selection, and a filter field on the Items page.

**The i18n wrinkle — decide before building.** Item names are LLM-translated for display. A Spanish-speaking cook sees `Pico de gallo`; the source row may say something else entirely. Search should match against **both the displayed (translated) name and the source name**, or a cook can't find an item by typing the name they heard from the chef in the other language. This is the whole point of the product; don't half-do it.

**Scale note.** Items are already shipped to the client in full, so client-side filtering adds no payload and no round-trip. That's the simple viable option. If a restaurant ever crosses ~1000 items, revisit with a server-side search action — but don't build that now.

**Touches:** `add-entry-row.tsx`, `items-list.tsx`, possibly a shared `<ItemCombobox>`, i18n keys.

---

## 3. Offline / dead zones

This is the one piece of **v1 scope in `overview.md` that is not yet built** (see "Graceful offline tolerance"). It is explicitly *not* full offline mode — no local DB, no conflict resolution. That's v2, and only if this isn't enough.

Two behaviors:

- **Cached reads.** A prep list stays viewable in a walk-in cooler with no signal.
- **Queued completions.** A cook can check items off with no signal; the checks sync when the connection returns.

**Not yet designed.** Needs its own decision pass before any code: service worker vs. plain cache, where the queue lives (IndexedDB?), what the UI says when offline, and what happens when a queued check lands on an entry someone else already deleted. Treat conflict handling as "last write wins, don't crash" — anything cleverer is v2.

---

## 4. Logo

Elijah is producing it. Drop-in change once it exists: the brand mark appears in the app shell top bar (`src/app/(app)/layout.tsx`) and on the auth pages (`src/components/auth/auth-form-wrapper.tsx`). Also needs a favicon and an `apple-touch-icon`.

---

## 5. README + feature list

**README** is stale — it predates the PrepInSync name and everything from Phase 4 onward. Wants: what the product is, the stack, local setup (env vars, `supabase/*.sql` manual-apply steps, migrations), and pointers into `docs/`.

**`docs/features.md` is a new, living catalog** and the more important half. A lot of deliberate work is invisible at a glance and gets no credit — from whoever evaluates this, and from us six months from now when we forget why something exists. Non-exhaustive list of things that belong in it:

- Bidirectional lazy translation with an MD5 `source_hash` staleness check, cached per `(entity, field, target language)`
- Translation corrections that feed back into the glossary
- Custom restaurant-defined units, translated at runtime (they can't live in the fixed glossary)
- The dashboard batches every list's entries into **one** LLM round-trip rather than one per list
- Duplicate-entry confirmation when adding an item already on the list
- Starred priority items float to the top
- Default quantity/unit prefill from the item, still editable
- Cook notes stored separately from builder instructions, so neither overwrites the other
- Soft-delete for team members — historical completion data survives, the person is locked out
- HEIC normalization on upload (canvas re-encode) so iPhone photos work at all
- Private Storage bucket with path-scoped RLS + server-generated signed URLs; DB stores the object *path*, never an expiring URL
- Per-step recipe images already modeled in JSONB, UI deferred to v2

Rule going forward: **a feature isn't done until it's in `docs/features.md`.** Keep it current in the same commit as the feature.

---

## Order

Theme persistence first (it's a real defect, and it touches the schema — do the migration while the DB context is loaded). Item search second (it's the hard scale blocker). Offline third — it's the largest and least-designed, so it wants its own plan-mode pass. Logo whenever it arrives. README + feature list **last**, so they document everything above.

---

## Conventions carried forward

- Plan mode for anything touching >2 files or the schema.
- Every user-facing string goes through `lib/i18n` — add to `en.ts` **and** `es.ts`.
- Migrations are append-only. Read `docs/database.md` first.
- RLS on every table; verify auth server-side on every authenticated route.
- Typecheck + lint after changes. Do **not** run `npm run build` while the dev server is up — they share `.next` and it corrupts the cache.
