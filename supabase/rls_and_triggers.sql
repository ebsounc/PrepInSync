-- =============================================================================
-- RLS policies and auth trigger for kitchen-app
--
-- Apply once via the Supabase dashboard SQL editor (or supabase db push).
-- This file is tracked in git but never touched by Drizzle.
-- Drizzle owns table DDL in drizzle/migrations/; this file owns everything else.
--
-- NOTE: this is the baseline. RLS for tables added later lives in its own
-- supabase/add_*.sql file (and is listed in docs/database.md's RLS summary):
--   - invites           → supabase/add_invites_table.sql
--   - restaurant_units  → supabase/add_restaurant_units_rls.sql
-- A fresh setup must apply those too. RLS is required on EVERY table.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- profiles: FK to auth.users + auto-create trigger on signup
-- ---------------------------------------------------------------------------

-- The FK constraint that Drizzle intentionally omits (cross-schema reference)
ALTER TABLE profiles
  ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Trigger function: inserts a profiles row when a new auth.users row is created.
-- Role and restaurant assignment happen during onboarding (after signup).
-- Trigger function: inserts a profiles row when a new auth.users row is created.
-- Reads first_name, last_name, and preferred_language from user metadata passed
-- by the signup form. Restaurant and role are finalized during onboarding.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, restaurant_id, role, first_name, last_name, preferred_language)
  VALUES (
    new.id,
    NULL,        -- no restaurant yet; set during onboarding
    'line_cook', -- default role; updated during onboarding/invite
    COALESCE(new.raw_user_meta_data->>'first_name', ''),
    COALESCE(new.raw_user_meta_data->>'last_name', ''),
    COALESCE(new.raw_user_meta_data->>'preferred_language', 'en')
  );
  RETURN new;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ---------------------------------------------------------------------------
-- RLS: restaurants
-- A user can see/edit only the restaurant they belong to.
-- ---------------------------------------------------------------------------
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see own restaurant"
  ON restaurants FOR SELECT
  USING (id = (SELECT restaurant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "users update own restaurant"
  ON restaurants FOR UPDATE
  USING (id = (SELECT restaurant_id FROM profiles WHERE id = auth.uid()));


-- ---------------------------------------------------------------------------
-- RLS: profiles
-- Users can read all profiles in their restaurant (needed to show team roster
-- and assignment dropdowns), but can only update their own row.
-- ---------------------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own restaurant profiles"
  ON profiles FOR SELECT
  USING (restaurant_id = (SELECT restaurant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "users update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "service role insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (true); -- trigger runs as SECURITY DEFINER; anon users cannot insert directly


-- ---------------------------------------------------------------------------
-- RLS: prep_items
-- ---------------------------------------------------------------------------
ALTER TABLE prep_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "restaurant isolation"
  ON prep_items FOR ALL
  USING (restaurant_id = (SELECT restaurant_id FROM profiles WHERE id = auth.uid()));


-- ---------------------------------------------------------------------------
-- RLS: prep_lists
-- ---------------------------------------------------------------------------
ALTER TABLE prep_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "restaurant isolation"
  ON prep_lists FOR ALL
  USING (restaurant_id = (SELECT restaurant_id FROM profiles WHERE id = auth.uid()));


-- ---------------------------------------------------------------------------
-- RLS: prep_list_entries
-- Entries inherit restaurant isolation via their parent prep_list.
-- ---------------------------------------------------------------------------
ALTER TABLE prep_list_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "restaurant isolation"
  ON prep_list_entries FOR ALL
  USING (
    prep_list_id IN (
      SELECT id FROM prep_lists
      WHERE restaurant_id = (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
    )
  );


-- ---------------------------------------------------------------------------
-- RLS: recipes
-- ---------------------------------------------------------------------------
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "restaurant isolation"
  ON recipes FOR ALL
  USING (restaurant_id = (SELECT restaurant_id FROM profiles WHERE id = auth.uid()));


-- ---------------------------------------------------------------------------
-- RLS: translations
-- Lazy translation cache. Isolated by the denormalized restaurant_id column
-- (added in migration 0005, and part of the unique key as of 0006). Replaced the
-- original USING (true) policy, which did not enforce tenant isolation.
-- ---------------------------------------------------------------------------
ALTER TABLE translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "restaurant isolation"
  ON translations FOR ALL
  USING (restaurant_id = (SELECT restaurant_id FROM profiles WHERE id = auth.uid()));


-- ---------------------------------------------------------------------------
-- RLS: glossary_overrides
-- ---------------------------------------------------------------------------
ALTER TABLE glossary_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "restaurant isolation"
  ON glossary_overrides FOR ALL
  USING (restaurant_id = (SELECT restaurant_id FROM profiles WHERE id = auth.uid()));
