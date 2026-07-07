-- ---------------------------------------------------------------------------
-- Storage: recipe cover photos + prep-item thumbnails (Phase 5)
--
-- One PRIVATE bucket. Objects are keyed by tenant: the first path segment is the
-- restaurant id, so `storage.objects` RLS can isolate per restaurant exactly like
-- every other table.
--   recipe cover:    {restaurantId}/recipes/{recipeId}/cover.jpg
--   item thumbnail:  {restaurantId}/items/{itemId}/thumb.jpg
--
-- Writes go through the service-role admin client (src/lib/storage), which
-- BYPASSES RLS — these policies are defense-in-depth for any direct anon/browser
-- access. Reads for display use short-lived signed URLs generated server-side, so
-- the browser never needs a direct RLS-checked read either.
--
-- Apply once via the Supabase dashboard SQL editor. The bucket does NOT exist
-- until this runs. Listed in docs/database.md's Storage section.
-- ---------------------------------------------------------------------------

-- Private bucket (public = false). Idempotent.
insert into storage.buckets (id, name, public)
values ('recipe-images', 'recipe-images', false)
on conflict (id) do nothing;

-- RLS is already enabled on storage.objects by Supabase. Scope every operation to
-- the caller's restaurant folder (first path segment == their restaurant_id).
create policy "recipe-images tenant read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'recipe-images'
    and (storage.foldername(name))[1] =
        (select restaurant_id::text from public.profiles where id = auth.uid())
  );

create policy "recipe-images tenant insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'recipe-images'
    and (storage.foldername(name))[1] =
        (select restaurant_id::text from public.profiles where id = auth.uid())
  );

create policy "recipe-images tenant update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'recipe-images'
    and (storage.foldername(name))[1] =
        (select restaurant_id::text from public.profiles where id = auth.uid())
  )
  with check (
    bucket_id = 'recipe-images'
    and (storage.foldername(name))[1] =
        (select restaurant_id::text from public.profiles where id = auth.uid())
  );

create policy "recipe-images tenant delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'recipe-images'
    and (storage.foldername(name))[1] =
        (select restaurant_id::text from public.profiles where id = auth.uid())
  );
