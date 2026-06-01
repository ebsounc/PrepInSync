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

RLS is **enabled on all 9 tables**. Policies as currently deployed:

| Table | Policy | Command | Rule |
|---|---|---|---|
| `restaurants` | users see own restaurant | SELECT | `id` = caller's restaurant |
| `restaurants` | users update own restaurant | UPDATE | `id` = caller's restaurant |
| `profiles` | users read own restaurant profiles | SELECT | same `restaurant_id` (team roster) |
| `profiles` | users update own profile | UPDATE | `id = auth.uid()` (self only) |
| `profiles` | service role insert profiles | INSERT | `WITH CHECK (true)` — only the `SECURITY DEFINER` trigger inserts |
| `prep_items` | restaurant isolation | ALL | `restaurant_id` = caller's restaurant |
| `prep_lists` | restaurant isolation | ALL | `restaurant_id` = caller's restaurant |
| `prep_list_entries` | restaurant isolation | ALL | parent `prep_list` is in caller's restaurant |
| `recipes` | restaurant isolation | ALL | `restaurant_id` = caller's restaurant |
| `glossary_overrides` | restaurant isolation | ALL | `restaurant_id` = caller's restaurant |
| `invites` | users read own restaurant invites | SELECT | `restaurant_id` = caller's restaurant (writes are server-side) |
| `translations` | authenticated users access translations | ALL | `USING (true)` for `authenticated` ⚠️ **see gap below** |

Source: [`supabase/rls_and_triggers.sql`](../supabase/rls_and_triggers.sql) and
[`supabase/add_invites_table.sql`](../supabase/add_invites_table.sql).

### ⚠️ Known gap — tighten before Phase 3

`translations` RLS is `USING (true)` for any authenticated user — it does **not**
enforce restaurant isolation. The original reasoning (it would require
denormalizing `restaurant_id` onto the table) is in the SQL comment. Translations
are read by `entity_id`, and the source entities are already RLS-protected at write
time, but a user-scoped read of `translations` directly is not isolated. **Must be
tightened before the Phase 3 translation work makes this table user-readable.**

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
can't drift. Columns stay `text` (not Postgres `ENUM` types) so adding a v2 language
is a one-line constraint change, consistent with the lazy-translation design in
`CLAUDE.md`.

---

## Translation cache model (pointer)

The `translations` table is a lazy cache keyed by
`(entity_type, entity_id, field, target_language)`, with `source_hash` (MD5 of the
source text) for automatic staleness detection. Full design rules are in
`CLAUDE.md` ("Translation rules") and the table comment in `schema.ts` — not
repeated here.
