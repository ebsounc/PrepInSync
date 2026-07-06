# Database architecture

Conceptual map of the database for anyone (human or AI) making schema changes.
It deliberately does **not** restate every column — that's what
[`src/lib/db/schema.ts`](../src/lib/db/schema.ts) is for, and duplicating it
here would only invite drift. This doc holds the things that are *scattered* or
*implicit* in the code: the division of responsibility, the migration workflow,
the RLS model, and the auth trigger.

> **Source of truth for table structure:** `src/lib/db/schema.ts` (well-commented,
> per-table). Always read it before changing a table.

---

## Division of responsibility (read this first)

Two systems own different parts of the database. Mixing them up is the most
common way to break things.

| Concern | Owned by | Lives in |
|---|---|---|
| Table & column DDL, `CHECK` constraints, unique indexes | **Drizzle** | `src/lib/db/schema.ts` → `drizzle/migrations/*.sql` |
| RLS policies, the `auth.users` FK, the signup trigger | **Raw SQL** (manual) | `supabase/*.sql` |

> When you add a Drizzle-owned table, you still hand-write its RLS in a new
> `supabase/*.sql` file (e.g. `restaurant_units` → `supabase/add_restaurant_units_rls.sql`).

Why split: Drizzle can't model cross-schema references (`profiles.id` →
`auth.users.id`), RLS policies, or triggers, so those are hand-written SQL applied
through Supabase. Everything Drizzle *can* model goes through Drizzle so the
generated migrations stay the structural source of truth.

**Rule:** never hand-write DDL for something Drizzle owns (it causes the schema/DB
drift the `0000` rebaseline was created to fix — see the `db-migrations-rebaselined`
memory). Add it to `schema.ts` and regenerate.

---

## Migration workflow

There is **no `__drizzle_migrations` tracking table** — `drizzle-kit migrate` is
not used. Applying a structural change:

1. Edit `src/lib/db/schema.ts`.
2. `npx drizzle-kit generate` → writes `drizzle/migrations/000N_*.sql` and updates
   the meta snapshot/journal. `generate` diffs the schema against the committed
   snapshot, so output is only the new statements.
3. Review the generated SQL (confirm no unexpected `DROP`s).
4. Apply it to Supabase — run the SQL in the dashboard SQL editor, or execute it
   against `DATABASE_URL` with the postgres client. Existing valid rows make
   constraint additions validate immediately.

Do **not** use `drizzle-kit push` (diffs the whole live DB and can propose
destructive changes; no SQL artifact).

RLS / trigger changes are not Drizzle — write a new `supabase/*.sql` file and run
it in the SQL editor.

> **Note on `CHECK` constraints in `schema.ts`:** use the `inLiterals()` helper,
> not drizzle's `inArray()`. `inArray()` inside a `check()` emits bound parameters
> (`$1, $2`) that are invalid in a generated DDL migration.

---

## Multi-tenancy

**One account = one restaurant.** `restaurants` is the tenant boundary. Every
tenant-scoped row carries `restaurant_id`, and a user's restaurant is resolved as:

```sql
(SELECT restaurant_id FROM profiles WHERE id = auth.uid())
```

`profiles.id` equals the Supabase `auth.users.id`. On signup `restaurant_id` is
`NULL` ("not yet onboarded"); onboarding sets it.

**Two access paths:**
- **Server-side (Drizzle / `DATABASE_URL`):** connects as the table owner and
  **bypasses RLS**. All mutations (server actions) go through here. Authorization
  is enforced in application code.
- **User-scoped Supabase client (`anon`/`authenticated` key):** RLS applies. This
  is the defense-in-depth layer for any direct client reads.

For `FOR ALL` policies that specify only `USING`, Postgres reuses that expression
as the `WITH CHECK` for inserts/updates — so those policies constrain writes to the
user's own restaurant too, even though writes normally go server-side.

---

## RLS summary (per table)

RLS is **enabled on all 10 tables**. Policies as currently deployed:

| Table | Policy | Command | Rule |
|---|---|---|---|
| `restaurants` | users see own restaurant | SELECT | `id` = caller's restaurant |
| `restaurants` | users update own restaurant | UPDATE | `id` = caller's restaurant |
| `profiles` | users read own restaurant profiles | SELECT | same `restaurant_id` (team roster) |
| `profiles` | users update own profile | UPDATE | `id = auth.uid()` (self only) |
| `profiles` | service role insert profiles | INSERT | `WITH CHECK (true)` — only the `SECURITY DEFINER` trigger inserts |
| `prep_items` | restaurant isolation | ALL | `restaurant_id` = caller's restaurant |
| `restaurant_units` | restaurant isolation | ALL | `restaurant_id` = caller's restaurant |
| `prep_lists` | restaurant isolation | ALL | `restaurant_id` = caller's restaurant |
| `prep_list_entries` | restaurant isolation | ALL | parent `prep_list` is in caller's restaurant |
| `recipes` | restaurant isolation | ALL | `restaurant_id` = caller's restaurant |
| `glossary_overrides` | restaurant isolation | ALL | `restaurant_id` = caller's restaurant |
| `invites` | users read own restaurant invites | SELECT | `restaurant_id` = caller's restaurant (writes are server-side) |
| `translations` | restaurant isolation | ALL | `restaurant_id` = caller's restaurant |

Source: [`supabase/rls_and_triggers.sql`](../supabase/rls_and_triggers.sql),
[`supabase/add_invites_table.sql`](../supabase/add_invites_table.sql), and
[`supabase/add_restaurant_units_rls.sql`](../supabase/add_restaurant_units_rls.sql).

### Translation isolation (Phase 3)

`translations` carries a denormalized `restaurant_id` (migration `0005`), set at
write time by the cache layer, and its RLS keys off it like every other
tenant-scoped table — the policy lives inline in `rls_and_triggers.sql`. This
replaced the original `USING (true)` policy, which did not enforce restaurant
isolation. `restaurant_id` is part of the unique key
`(restaurant_id, entity_type, entity_id, field, target_language)` as of migration
`0006`, so an upsert conflict can never re-home a cached row to another tenant.

---

## Auth & profile lifecycle

- `profiles.id` → `auth.users.id` FK (`ON DELETE CASCADE`) is added in
  `supabase/rls_and_triggers.sql` (Drizzle intentionally omits it — cross-schema).
- Trigger `on_auth_user_created` on `auth.users` runs `public.handle_new_user()`
  (`SECURITY DEFINER`), inserting a `profiles` row on signup. It reads
  `first_name`, `last_name`, `preferred_language` from the signup form's auth
  metadata; `restaurant_id` is `NULL` and `role` defaults to `line_cook` until
  onboarding finalizes them.
- Trusted invite data (restaurant/role/permission) comes from the `invites` table
  on acceptance, **not** from user-editable `user_metadata`.

The current trigger definition (with `restaurant_id = NULL`) is the one in
`rls_and_triggers.sql`; earlier `supabase/fix_*.sql` files are superseded
historical steps.

---

## Enum domains

Columns like `profiles.role` and the `*_language` columns are plain `text` with two
layers of enforcement:
- **TypeScript:** drizzle `{ enum }` narrows the type at compile time.
- **Database:** `CHECK` constraints (migration `0001`) reject invalid values at
  write time, even from raw SQL or the service-role key.

Both lists come from the shared `ROLES` / `LANGUAGES` consts in `schema.ts`, so they
can't drift. `restaurants.list_default_day` follows the same pattern (`LIST_DAYS` const +
CHECK, migration `0003`). Columns stay `text` (not Postgres `ENUM` types) so adding a v2
language is a one-line constraint change, consistent with the lazy-translation design in
`CLAUDE.md`.

---

## Column gotchas (name ≠ meaning)

- **`prep_items` has two amount pairs.** `default_quantity` / `default_unit` = the batch
  amount that **prefills** a list entry when the item is picked (editable). `par_quantity` /
  `par_unit` = the item's **par level** (target stock to keep on hand) — informational.
  (In round 2 `par_*` temporarily held the default; migration `0003` moved those values to
  `default_*` and freed `par_*` for the par level.)
- **`prep_list_entries.notes` is the builder note** — labeled "Instructions for cook" in the
  UI, read-only to the cook. **`cook_note`** is the cook's own note from the floor, with
  **`cook_note_by`** recording who wrote it (so the UI shows "Your note" / "<Name>'s note").
  The cook action writes `cook_note` + `cook_note_by`; the builder forms write `notes`.
- **`restaurants.list_default_day`** (`'today'` | `'next_day'`, CHECK-constrained) sets whether
  a new prep list defaults its date/title to today or the next day.
- **Units are free text** on `default_unit`, `par_unit`, and `prep_list_entries.unit`: a
  built-in value (`lib/units.ts`) *or* a restaurant's custom unit (`restaurant_units.label`).
  Writes are validated by `isValidUnit()` in `lib/db/queries/restaurant-units.ts`.

## Translation cache model (pointer)

The `translations` table is a lazy cache keyed by
`(entity_type, entity_id, field, target_language)`, with `source_hash` (MD5 of the
source text) for automatic staleness detection. Full design rules are in
`CLAUDE.md` ("Translation rules") and the table comment in `schema.ts` — not
repeated here.

### Recipe fields (Phase 4)

`recipes.ingredients` and `recipes.instructions` are JSONB arrays, so their
translatable sub-fields are keyed **positionally** in the flat `field` column:

- ingredient name → `ingredient:{i}:name`
- ingredient unit → `ingredient:{i}:unit` (only free-text units — see below)
- step text → `step:{i}:text`

`entity_type` is `'recipe'`, `entity_id` is the recipe id. The keying lives in
`translateRecipe` ([src/lib/translation/apply.ts](../src/lib/translation/apply.ts))
and the corrections wiring on the recipe page. Because keys are positional,
reordering ingredients/steps shifts which cached row a position maps to — the
`source_hash` check then treats the moved text as stale and re-translates, so it's
self-correcting (never shows the wrong translation, just re-spends on a reorder).

**Recipe units are free text**, deliberately NOT validated by `isValidUnit`
(a pasted recipe uses "cup"/"tbsp"/"clove", which aren't built-ins or the
restaurant's custom units). Unit translation is three-way: built-in units
(`lib/units.ts` `UNIT_VALUES`) render via the static `formatAmount` table; a unit
that matches a restaurant custom unit uses that label map; anything else goes
through the LLM cache as `ingredient:{i}:unit`.

**Editing a recipe needs no explicit cache delete** — `source_hash` staleness
regenerates changed fields on next read (same as items/lists). Only the
corrections path (source text unchanged, desired translation changed) calls
`deleteTranslationsFor`.

**Big entities are chunked.** `getTranslations` splits a cache miss into
`TRANSLATE_CHUNK_SIZE`-field chunks (10) and translates them in parallel — a full
recipe is 30+ fields and a single LLM call for all of them overran
`translateBatch`'s per-call timeout and failed wholesale (nothing cached, so it
never recovered). Chunks cache independently, so one slow/failed chunk only falls
its own fields back to source text.

**Known gap (accepted for v1):** deleting a recipe (or reordering/removing
ingredients) leaves its `translations` rows orphaned — `translations.entity_id`
is not a FK, so nothing cascades. Those rows are restaurant-scoped by RLS and
never re-read (the positional key no longer resolves), so they're inert; they just
accumulate. A future cleanup could delete `translations WHERE entity_type='recipe'
AND entity_id=$id` on recipe delete.

### One recipe per item (app-level, no DB constraint)

`recipes.prep_item_id` has **no** UNIQUE index. One-recipe-per-item is enforced in
the create action (`createRecipeAction` → `hasRecipe` check) and reads take the
oldest row (`getRecipeByItemId` orders by `created_at` and `limit 1`). This keeps
Phase 4 migration-free (the table shipped in baseline `0000`). The clean future
upgrade is a `uniqueIndex('one_recipe_per_item').on(recipes.prepItemId)` migration
if a concurrent double-create ever proves to be a real problem.
