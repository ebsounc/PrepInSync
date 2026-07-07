# Phase 5 — Photo recipe ingestion + Storage images

The last v1 build phase. Two deliverables: **photo recipe ingestion** (snap a binder
page → Claude vision extracts ingredients/steps → same review flow as paste-parse)
and **persisted images** (recipe cover photos + prep-item thumbnails) on a private
Supabase Storage bucket. Read [CLAUDE.md](../CLAUDE.md), [database.md](database.md)
"Storage", and [phase-4-recipes.md](phase-4-recipes.md) first.

## What shipped

- **Photo ingestion** — a "Scan a photo" panel next to "Paste a recipe" in the recipe
  editor. Takes a camera/library photo, downscales it client-side, and sends it to
  `scanRecipe` (Claude Sonnet 4.6 vision) which returns the same `{ingredients, steps}`
  shape as paste. Fills the review form; the chef edits and saves. **The image is used
  inline and never stored.**
- **Recipe cover photo** — managed on a saved recipe (RecipeView): add/replace/remove.
  Displayed above the recipe.
- **Prep-item thumbnail** — managed in the item edit form; shown next to the item name
  in the list.
- Both persisted images go to the private bucket `recipe-images`, path-scoped by
  restaurant, displayed via server-generated signed URLs.

## Decisions

1. **Private bucket + path-scoped RLS + signed URLs** — tenant isolation matching the
   app's stance; no public buckets. `image_url` stores the object **path** (signed URLs
   expire). See [database.md](database.md) "Storage".
2. **Ingestion sends the photo inline and discards it** — vision extraction doesn't
   need Storage; only cover/thumbnail uploads persist.
3. **Client downscale + JPEG re-encode** ([lib/images/downscale.ts](../src/lib/images/downscale.ts))
   before any upload/scan — shrinks payloads AND normalizes iOS **HEIC** (the browser
   decodes it and we emit JPEG, so the server never sees HEIC).
4. **base64 transport** for scan + image uploads (matches the paste-parse action
   pattern via `useTransition`, not `<form>`). Server validates type + size
   ([lib/images/validate.ts](../src/lib/images/validate.ts)).
5. **Plain `<img>`** with signed URLs — no `next/image` (small images; dynamic
   expiring URLs defeat the CDN benefit and would need per-host config).

## Key files

- AI: `scanRecipe` in [lib/ai/index.ts](../src/lib/ai/index.ts) (vision `generateObject`, `messages` + image part, 30s timeout).
- Storage: [lib/storage/index.ts](../src/lib/storage/index.ts) (admin client — upload / signed-URL / delete / path helpers), bucket + RLS in [supabase/add_recipe_images_storage.sql](../supabase/add_recipe_images_storage.sql).
- Image utils: [lib/images/downscale.ts](../src/lib/images/downscale.ts) (client), [lib/images/validate.ts](../src/lib/images/validate.ts) (server).
- Actions: `scanRecipeAction` / `setRecipeImageAction` / `removeRecipeImageAction` in [recipe/actions.ts](../src/app/(app)/items/[id]/recipe/actions.ts); `setItemImageAction` / `removeItemImageAction` in [items/actions.ts](../src/app/(app)/items/actions.ts).
- UI: `ScanPanel` + `CoverPhotoControl` in the recipe editor/view; `ItemPhotoControl` + thumbnail in [items-list.tsx](../src/app/(app)/items/_components/items-list.tsx); signed-URL wiring in the recipe + items pages.

## No Drizzle migration

`recipes.image_url` and `prep_items.image_url` already existed (unused). **But** the
Storage bucket + `storage.objects` RLS are a **manual apply step**: run
`supabase/add_recipe_images_storage.sql` in the Supabase SQL editor. Nothing works
until it does.

## Deploy note

The scan path calls Claude vision with a 30s timeout — the Vercel function running
that server action needs `maxDuration ≥ 30`. First time the app needs a duration bump
(paste-parse is 20s). Fine locally.

## Verification

- `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- Apply the storage SQL first.
- Manual E2E (test kitchen, builder `sam@kitchenapp.test` / `QaTest1234!`):
  1. Recipe editor → "Scan a photo" → pick a photo of a recipe → review prefilled → save.
  2. On a saved recipe → "Add cover photo" → reopen (or as a second same-restaurant
     user) → cover renders via signed URL.
  3. Item edit → "Add photo" → thumbnail shows in the list.
  4. **Cross-tenant**: another restaurant's user can't fetch a foreign object path
     (RLS blocks direct access; the app never hands them the path).
  5. Delete a recipe/item → Storage objects gone (best-effort).
