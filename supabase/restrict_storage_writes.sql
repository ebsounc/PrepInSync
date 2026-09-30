-- ---------------------------------------------------------------------------
-- Storage: make `recipe-images` write-only-by-the-server.
-- Run after add_recipe_images_storage.sql. Idempotent.
--
-- Every upload and delete in the app goes through the service-role admin client
-- (src/lib/storage), which bypasses storage RLS. So the tenant insert/update/delete
-- policies granted nothing the app uses — they only let any signed-in browser
-- session write to its own restaurant folder directly through the Storage API,
-- skipping the app's size/type checks and rate limits. With the one-click public
-- demo, that meant any visitor could delete or overwrite the seeded demo photos
-- (which resets don't restore) or upload arbitrary files without limit.
--
-- The SELECT policy stays (tenant-scoped reads; the app itself only hands out
-- server-signed URLs).
-- ---------------------------------------------------------------------------

drop policy if exists "recipe-images tenant insert" on storage.objects;
drop policy if exists "recipe-images tenant update" on storage.objects;
drop policy if exists "recipe-images tenant delete" on storage.objects;

-- Bucket-level ceilings, enforced by Storage for every caller including the service
-- role. 4 MB matches MAX_IMAGE_BYTES in src/lib/images/validate.ts, so nothing the
-- app accepts is rejected here.
update storage.buckets
set file_size_limit = 4194304,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'recipe-images';
