-- restaurant_id was NOT NULL with a fake placeholder UUID, but the FK constraint
-- prevents inserting a non-existent UUID. Make it nullable — NULL means "not yet onboarded".
ALTER TABLE profiles ALTER COLUMN restaurant_id DROP NOT NULL;

-- Update trigger to insert NULL instead of the non-existent placeholder UUID
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
    NULL,
    'line_cook',
    COALESCE(new.raw_user_meta_data->>'first_name', ''),
    COALESCE(new.raw_user_meta_data->>'last_name', ''),
    COALESCE(new.raw_user_meta_data->>'preferred_language', 'en')
  );
  RETURN new;
END;
$$;
