-- Fix handle_new_user trigger: previous version used role 'prep_cook' (removed)
-- and did not supply first_name / last_name (now NOT NULL).
--
-- The signup form passes first_name, last_name, and optionally preferred_language
-- via Supabase Auth user metadata. The trigger reads them from raw_user_meta_data.
-- Onboarding must update restaurant_id and role before the user can access the app.

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
    '00000000-0000-0000-0000-000000000000',  -- placeholder; replaced during onboarding
    'line_cook',                              -- default; updated during onboarding/invite
    COALESCE(new.raw_user_meta_data->>'first_name', ''),
    COALESCE(new.raw_user_meta_data->>'last_name', ''),
    COALESCE(new.raw_user_meta_data->>'preferred_language', 'en')
  );
  RETURN new;
END;
$$;
