import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'

// Single private bucket; tenant isolation is by path (first segment = restaurant).
// See supabase/add_recipe_images_storage.sql. All access here uses the service-role
// admin client (bypasses storage RLS); RLS is defense-in-depth for direct client reads.
const BUCKET = 'recipe-images'
const SIGNED_URL_TTL = 3600 // 1 hour

// Fixed filenames + upsert → at most one object per entity, replace overwrites.
export const recipeCoverPath = (restaurantId: string, recipeId: string) =>
  `${restaurantId}/recipes/${recipeId}/cover.jpg`
export const itemThumbPath = (restaurantId: string, itemId: string) =>
  `${restaurantId}/items/${itemId}/thumb.jpg`

export async function uploadImage(
  path: string,
  bytes: Uint8Array,
  contentType: string
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType, upsert: true })
  if (error) throw error
}

// A signed URL for one object, or null on failure (display falls back to no image).
export async function getSignedUrl(path: string): Promise<string | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL)
  if (error || !data) return null
  return data.signedUrl
}

// One round-trip for many objects — used by list views to avoid N calls. Returns a
// map of path → signed URL; paths that fail to sign are simply absent.
export async function getSignedUrls(paths: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (paths.length === 0) return map
  const supabase = createAdminClient()
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL)
  if (error || !data) return map
  for (const row of data) {
    if (row.signedUrl && row.path) map.set(row.path, row.signedUrl)
  }
  return map
}

export async function deleteImage(path: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) throw error
}

// Removes every object directly under a folder (one level — our entity folders hold
// a single file). Used on entity delete. Best-effort: callers swallow errors so a
// storage hiccup never blocks the DB delete.
export async function deletePrefix(prefix: string): Promise<void> {
  const supabase = createAdminClient()
  const folder = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix
  const { data, error } = await supabase.storage.from(BUCKET).list(folder)
  if (error || !data || data.length === 0) return
  const paths = data.map((obj) => `${folder}/${obj.name}`)
  await supabase.storage.from(BUCKET).remove(paths)
}
