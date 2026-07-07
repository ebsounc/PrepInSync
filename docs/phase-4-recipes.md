# Phase 4 — Recipes (text-first, bilingual)

Phases 1–3 (auth, core prep, translation layer) are done and merged. Phase 4 adds
**recipes attached to prep items**, text-first, feeding the existing translation
pipeline. This doc records what was built, the decisions, and how to verify it.
Read [CLAUDE.md](../CLAUDE.md) "Translation rules" and
[database.md](database.md) "Recipe fields" first.

## What shipped

- A recipe is **optional, one per prep item** (`recipes.prep_item_id`). Management
  (`can_create_lists`) authors/edits; **any active member can view** — the cook's
  read path.
- **Manual entry**: a structured editor — dynamic ingredient rows (name + quantity
  + free-text unit) and dynamic ordered steps.
- **Paste-from-document**: paste raw recipe text → `parseRecipe` (Sonnet 4.6) →
  structured ingredients/steps prefill the editor → chef reviews/edits → saves.
  Parsing keeps the author's original language; it does **not** translate.
- **Translation**: ingredient names, free-text units, and step text translate
  lazily through the existing cache, per viewer language, correctable via the
  standard "Fix a translation" affordance.
- **Cook entry points**: a recipe link on each item (items page) and on each
  prep-list entry whose item has a recipe.

## Scope decisions

1. **Text-only.** No image upload. `recipes.image_url` and per-step `imageUrl`
   stay unused until phase 5 builds Supabase Storage + photo ingestion together.
2. **Cook read-only viewing is in scope** — it's the core "recipes in your
   language" value.
3. **Both manual + paste-parse** shipped together.

## Key files

- DB: [src/lib/db/queries/recipes.ts](../src/lib/db/queries/recipes.ts)
- AI: `parseRecipe` in [src/lib/ai/index.ts](../src/lib/ai/index.ts)
- Translation: `translateRecipe` in [src/lib/translation/apply.ts](../src/lib/translation/apply.ts)
- Route: [src/app/(app)/items/[id]/recipe/](../src/app/(app)/items/[id]/recipe/)
  (`page.tsx`, `actions.ts`, `_components/recipe-editor.tsx`, `_components/recipe-view.tsx`)
- Cook links: `items/_components/items-list.tsx`, `prep-lists/[id]/_components/entry-row.tsx`

## No migration

The `recipes` table + its RLS shipped in baseline `0000` — Phase 4 is app code
only. See [database.md](database.md) "Recipe fields" for the translation keying,
the app-level one-per-item enforcement, and the free-text-unit rule.

## Conventions carried / divergences

- **Dedicated route** (`items/[id]/recipe`), not the inline-expand items pattern —
  the multi-ingredient/multi-step + paste form is too large to nest on mobile.
- **Recipe units are free text**, not `isValidUnit`-validated, and are NOT added to
  the restaurant's custom-unit list.
- Recipe payload reaches the action as a **JSON string** (`recipe` form field), not
  flat FormData — variable-length arrays.
- Same gating/i18n/action conventions as items otherwise: `requireBuilder`, Zod
  messages as dictionary KEYs via `resolveKey`, strings in `lib/i18n` en+es.

## Verification (manual, en↔es)

Test accounts: [test-accounts.md](test-accounts.md).

1. Builder (en) adds a recipe manually with a built-in unit (`qt`) and a free-text
   unit (`cup`) → save → reopen intact.
2. Paste a real en recipe → review the prefill → save. Paste garbage → "Couldn't
   read that recipe" and the manual form still works.
3. Cook (es) opens the recipe from the items page AND from a prep-list entry →
   translated ingredients/steps; `qt` → `cuarto/cuartos`, `cup` translated, numbers
   preserved.
4. "Fix a translation" on a wrong ingredient → reload shows the correction + a
   `glossary_overrides` row.
5. Builder edits one ingredient name → cook reloads es → only that field
   re-translates (source_hash), others stay cached.
6. Delete recipe → links disappear. Delete the item → recipe cascades (no orphan).

## Simulation run (2026-07-06)

Verified end-to-end in "test kitchen": 5 recipes (Pico hand-written; Ranch,
Guacamole, Birria meat, Salsa verde via paste-parse — the 17-ingredient birria
included), a 7/6 prep list with all five, and en→es viewing. Spanish output was
kitchen-accurate (e.g. "chambarete de res", "raja de canela", "Sella la carne",
"caldo de res"; units → "cucharada"/"tazas"/"libras").

Two bugs found and fixed:
- **Quantity-less ingredients** ("salt to taste") rendered as "0" — `formatQuantity('')`
  returned "0" because `Number('') === 0`. Fixed to treat empty as ''.
- **Large recipes never translated** — a 30+-field batch overran `translateBatch`'s
  timeout and fell back to source text every time. Fixed by chunking the cache
  batch (see [database.md](database.md) "Big entities are chunked").
