-- =============================================================================
-- invites: RLS
--
-- The table DDL lives in the Drizzle baseline (drizzle/migrations/), consistent
-- with the rest of the schema. This file owns RLS only, like rls_and_triggers.sql.
--
-- The invites row is the source of truth for an invited user's
-- restaurant/role/permission on acceptance — read there instead of
-- user_metadata, which the user can edit via supabase.auth.updateUser.
--
-- Writes (create/delete/accept) happen server-side via the Drizzle connection,
-- which bypasses RLS. This SELECT policy lets a future management UI list its
-- own restaurant's pending invites via the user-scoped client without leaking
-- other restaurants' invites.
-- =============================================================================
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own restaurant invites"
  ON invites FOR SELECT
  USING (restaurant_id = (SELECT restaurant_id FROM profiles WHERE id = auth.uid()));
