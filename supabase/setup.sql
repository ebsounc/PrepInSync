-- =============================================================================
-- PrepInSync - one-shot database setup for a FRESH Supabase project.
--
-- Paste this whole file into the Supabase SQL editor (or run it with the postgres
-- client on DATABASE_URL) ONCE, against an empty project. It creates every table,
-- constraint, RLS policy, the signup trigger, and the recipe-image Storage bucket
-- - the complete schema in one step.
--
-- This is the flattened CURRENT state, generated from the live schema via pg_dump.
-- The per-change history lives in drizzle/migrations/ (tables) and the other
-- supabase/*.sql files (RLS/triggers/storage); see docs/database.md for the model.
--
-- NOTE: generated from the live schema - validate on a throwaway Supabase project
-- before relying on it.
-- =============================================================================

--
-- PostgreSQL database dump
--

\restrict ziiOQJO2aHHd1KlgzGfamRmHb3LoXRxgaCj55gWPZsVIwxaNNW8g8fp4NHhL5QZ

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: glossary_overrides; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.glossary_overrides (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    restaurant_id uuid NOT NULL,
    source_term text NOT NULL,
    source_language text NOT NULL,
    target_language text NOT NULL,
    preferred_translation text NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT glossary_overrides_source_language_check CHECK ((source_language = ANY (ARRAY['en'::text, 'es'::text]))),
    CONSTRAINT glossary_overrides_target_language_check CHECK ((target_language = ANY (ARRAY['en'::text, 'es'::text])))
);


--
-- Name: invites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    restaurant_id uuid NOT NULL,
    role text NOT NULL,
    can_create_lists boolean DEFAULT false NOT NULL,
    invited_by uuid NOT NULL,
    accepted_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT invites_role_check CHECK ((role = ANY (ARRAY['owner'::text, 'general_manager'::text, 'kitchen_manager'::text, 'head_chef'::text, 'sous_chef'::text, 'prep_chef'::text, 'line_cook'::text, 'expeditor'::text])))
);


--
-- Name: prep_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prep_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    restaurant_id uuid NOT NULL,
    name text NOT NULL,
    source_language text DEFAULT 'en'::text NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    image_url text,
    par_quantity numeric,
    par_unit text,
    description text,
    default_quantity numeric,
    default_unit text,
    CONSTRAINT prep_items_source_language_check CHECK ((source_language = ANY (ARRAY['en'::text, 'es'::text])))
);


--
-- Name: prep_list_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prep_list_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    prep_list_id uuid NOT NULL,
    prep_item_id uuid NOT NULL,
    quantity numeric NOT NULL,
    unit text NOT NULL,
    notes text,
    completed boolean DEFAULT false NOT NULL,
    completed_at timestamp without time zone,
    completed_by uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    is_starred boolean DEFAULT false NOT NULL,
    cook_note text,
    cook_note_by uuid,
    notes_source_language text DEFAULT 'en'::text NOT NULL,
    cook_note_source_language text DEFAULT 'en'::text NOT NULL,
    CONSTRAINT ple_cook_note_source_language_check CHECK ((cook_note_source_language = ANY (ARRAY['en'::text, 'es'::text]))),
    CONSTRAINT ple_notes_source_language_check CHECK ((notes_source_language = ANY (ARRAY['en'::text, 'es'::text])))
);


--
-- Name: prep_lists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prep_lists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    restaurant_id uuid NOT NULL,
    title text NOT NULL,
    date date NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    source_language text DEFAULT 'en'::text NOT NULL,
    CONSTRAINT prep_lists_source_language_check CHECK ((source_language = ANY (ARRAY['en'::text, 'es'::text])))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    restaurant_id uuid,
    role text NOT NULL,
    preferred_language text DEFAULT 'en'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    phone text,
    is_active boolean DEFAULT true NOT NULL,
    can_create_lists boolean DEFAULT false NOT NULL,
    theme text DEFAULT 'system'::text NOT NULL,
    accent_color text,
    CONSTRAINT profiles_preferred_language_check CHECK ((preferred_language = ANY (ARRAY['en'::text, 'es'::text]))),
    CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['owner'::text, 'general_manager'::text, 'kitchen_manager'::text, 'head_chef'::text, 'sous_chef'::text, 'prep_chef'::text, 'line_cook'::text, 'expeditor'::text]))),
    CONSTRAINT profiles_theme_check CHECK ((theme = ANY (ARRAY['light'::text, 'dark'::text, 'system'::text])))
);


--
-- Name: recipes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recipes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    prep_item_id uuid NOT NULL,
    restaurant_id uuid NOT NULL,
    ingredients jsonb NOT NULL,
    instructions jsonb NOT NULL,
    source_language text DEFAULT 'en'::text NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    image_url text,
    CONSTRAINT recipes_source_language_check CHECK ((source_language = ANY (ARRAY['en'::text, 'es'::text])))
);


--
-- Name: restaurant_units; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.restaurant_units (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    restaurant_id uuid NOT NULL,
    label text NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    source_language text DEFAULT 'en'::text NOT NULL,
    CONSTRAINT restaurant_units_source_language_check CHECK ((source_language = ANY (ARRAY['en'::text, 'es'::text])))
);


--
-- Name: restaurants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.restaurants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    timezone text NOT NULL,
    list_default_day text DEFAULT 'today'::text NOT NULL,
    CONSTRAINT restaurants_list_default_day_check CHECK ((list_default_day = ANY (ARRAY['today'::text, 'next_day'::text])))
);


--
-- Name: translations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.translations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    field text NOT NULL,
    target_language text NOT NULL,
    translated_text text NOT NULL,
    source_hash text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    restaurant_id uuid NOT NULL,
    CONSTRAINT translations_target_language_check CHECK ((target_language = ANY (ARRAY['en'::text, 'es'::text])))
);


--
-- Name: glossary_overrides glossary_overrides_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.glossary_overrides
    ADD CONSTRAINT glossary_overrides_pkey PRIMARY KEY (id);


--
-- Name: glossary_overrides glossary_overrides_restaurant_id_source_term_source_language_ta; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.glossary_overrides
    ADD CONSTRAINT glossary_overrides_restaurant_id_source_term_source_language_ta UNIQUE (restaurant_id, source_term, source_language, target_language);


--
-- Name: invites invites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invites
    ADD CONSTRAINT invites_pkey PRIMARY KEY (id);


--
-- Name: prep_items prep_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prep_items
    ADD CONSTRAINT prep_items_pkey PRIMARY KEY (id);


--
-- Name: prep_list_entries prep_list_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prep_list_entries
    ADD CONSTRAINT prep_list_entries_pkey PRIMARY KEY (id);


--
-- Name: prep_lists prep_lists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prep_lists
    ADD CONSTRAINT prep_lists_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: recipes recipes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipes
    ADD CONSTRAINT recipes_pkey PRIMARY KEY (id);


--
-- Name: restaurant_units restaurant_units_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurant_units
    ADD CONSTRAINT restaurant_units_pkey PRIMARY KEY (id);


--
-- Name: restaurant_units restaurant_units_restaurant_id_label_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurant_units
    ADD CONSTRAINT restaurant_units_restaurant_id_label_unique UNIQUE (restaurant_id, label);


--
-- Name: restaurants restaurants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurants
    ADD CONSTRAINT restaurants_pkey PRIMARY KEY (id);


--
-- Name: translations translations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.translations
    ADD CONSTRAINT translations_pkey PRIMARY KEY (id);


--
-- Name: translations translations_restaurant_id_entity_type_entity_id_field_target_l; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.translations
    ADD CONSTRAINT translations_restaurant_id_entity_type_entity_id_field_target_l UNIQUE (restaurant_id, entity_type, entity_id, field, target_language);


--
-- Name: one_owner_per_restaurant; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX one_owner_per_restaurant ON public.profiles USING btree (restaurant_id) WHERE (role = 'owner'::text);


--
-- Name: glossary_overrides glossary_overrides_created_by_profiles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.glossary_overrides
    ADD CONSTRAINT glossary_overrides_created_by_profiles_id_fk FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: glossary_overrides glossary_overrides_restaurant_id_restaurants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.glossary_overrides
    ADD CONSTRAINT glossary_overrides_restaurant_id_restaurants_id_fk FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id);


--
-- Name: invites invites_invited_by_profiles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invites
    ADD CONSTRAINT invites_invited_by_profiles_id_fk FOREIGN KEY (invited_by) REFERENCES public.profiles(id);


--
-- Name: invites invites_restaurant_id_restaurants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invites
    ADD CONSTRAINT invites_restaurant_id_restaurants_id_fk FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id);


--
-- Name: prep_items prep_items_created_by_profiles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prep_items
    ADD CONSTRAINT prep_items_created_by_profiles_id_fk FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: prep_items prep_items_restaurant_id_restaurants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prep_items
    ADD CONSTRAINT prep_items_restaurant_id_restaurants_id_fk FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id);


--
-- Name: prep_list_entries prep_list_entries_completed_by_profiles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prep_list_entries
    ADD CONSTRAINT prep_list_entries_completed_by_profiles_id_fk FOREIGN KEY (completed_by) REFERENCES public.profiles(id);


--
-- Name: prep_list_entries prep_list_entries_cook_note_by_profiles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prep_list_entries
    ADD CONSTRAINT prep_list_entries_cook_note_by_profiles_id_fk FOREIGN KEY (cook_note_by) REFERENCES public.profiles(id);


--
-- Name: prep_list_entries prep_list_entries_prep_item_id_prep_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prep_list_entries
    ADD CONSTRAINT prep_list_entries_prep_item_id_prep_items_id_fk FOREIGN KEY (prep_item_id) REFERENCES public.prep_items(id);


--
-- Name: prep_list_entries prep_list_entries_prep_list_id_prep_lists_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prep_list_entries
    ADD CONSTRAINT prep_list_entries_prep_list_id_prep_lists_id_fk FOREIGN KEY (prep_list_id) REFERENCES public.prep_lists(id) ON DELETE CASCADE;


--
-- Name: prep_lists prep_lists_created_by_profiles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prep_lists
    ADD CONSTRAINT prep_lists_created_by_profiles_id_fk FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: prep_lists prep_lists_restaurant_id_restaurants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prep_lists
    ADD CONSTRAINT prep_lists_restaurant_id_restaurants_id_fk FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id);


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_restaurant_id_restaurants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_restaurant_id_restaurants_id_fk FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id);


--
-- Name: recipes recipes_created_by_profiles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipes
    ADD CONSTRAINT recipes_created_by_profiles_id_fk FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: recipes recipes_prep_item_id_prep_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipes
    ADD CONSTRAINT recipes_prep_item_id_prep_items_id_fk FOREIGN KEY (prep_item_id) REFERENCES public.prep_items(id) ON DELETE CASCADE;


--
-- Name: recipes recipes_restaurant_id_restaurants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipes
    ADD CONSTRAINT recipes_restaurant_id_restaurants_id_fk FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id);


--
-- Name: restaurant_units restaurant_units_created_by_profiles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurant_units
    ADD CONSTRAINT restaurant_units_created_by_profiles_id_fk FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: restaurant_units restaurant_units_restaurant_id_restaurants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurant_units
    ADD CONSTRAINT restaurant_units_restaurant_id_restaurants_id_fk FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id);


--
-- Name: translations translations_restaurant_id_restaurants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.translations
    ADD CONSTRAINT translations_restaurant_id_restaurants_id_fk FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id);


--
-- Name: glossary_overrides; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.glossary_overrides ENABLE ROW LEVEL SECURITY;

--
-- Name: invites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

--
-- Name: prep_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prep_items ENABLE ROW LEVEL SECURITY;

--
-- Name: prep_list_entries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prep_list_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: prep_lists; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prep_lists ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: recipes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

--
-- Name: glossary_overrides restaurant isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "restaurant isolation" ON public.glossary_overrides USING ((restaurant_id = ( SELECT profiles.restaurant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: prep_items restaurant isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "restaurant isolation" ON public.prep_items USING ((restaurant_id = ( SELECT profiles.restaurant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: prep_list_entries restaurant isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "restaurant isolation" ON public.prep_list_entries USING ((prep_list_id IN ( SELECT prep_lists.id
   FROM public.prep_lists
  WHERE (prep_lists.restaurant_id = ( SELECT profiles.restaurant_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));


--
-- Name: prep_lists restaurant isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "restaurant isolation" ON public.prep_lists USING ((restaurant_id = ( SELECT profiles.restaurant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: recipes restaurant isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "restaurant isolation" ON public.recipes USING ((restaurant_id = ( SELECT profiles.restaurant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: restaurant_units restaurant isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "restaurant isolation" ON public.restaurant_units USING ((restaurant_id = ( SELECT profiles.restaurant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: translations restaurant isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "restaurant isolation" ON public.translations USING ((restaurant_id = ( SELECT profiles.restaurant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: restaurant_units; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.restaurant_units ENABLE ROW LEVEL SECURITY;

--
-- Name: restaurants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

-- NOTE: a "service role insert profiles" INSERT policy WITH CHECK (true) used to live
-- here. It was removed as a security fix: with no `TO` clause it applied to anon +
-- authenticated, letting any caller INSERT arbitrary profiles rows. The signup trigger
-- (handle_new_user) is SECURITY DEFINER and service_role bypasses RLS, so no legitimate
-- path needed it. See the "Security hardening" block at the end of this file.


--
-- Name: translations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;

--
-- Name: invites users read own restaurant invites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users read own restaurant invites" ON public.invites FOR SELECT USING ((restaurant_id = ( SELECT profiles.restaurant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: profiles users read own restaurant profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users read own restaurant profiles" ON public.profiles FOR SELECT USING ((restaurant_id = ( SELECT profiles_1.restaurant_id
   FROM public.profiles profiles_1
  WHERE (profiles_1.id = auth.uid()))));


--
-- Name: restaurants users see own restaurant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users see own restaurant" ON public.restaurants FOR SELECT USING ((id = ( SELECT profiles.restaurant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: profiles users update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE USING ((id = auth.uid()));


--
-- Name: restaurants users update own restaurant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users update own restaurant" ON public.restaurants FOR UPDATE USING ((id = ( SELECT profiles.restaurant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.handle_new_user() TO anon;
GRANT ALL ON FUNCTION public.handle_new_user() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;


--
-- Name: TABLE glossary_overrides; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.glossary_overrides TO anon;
GRANT ALL ON TABLE public.glossary_overrides TO authenticated;
GRANT ALL ON TABLE public.glossary_overrides TO service_role;


--
-- Name: TABLE invites; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.invites TO anon;
GRANT ALL ON TABLE public.invites TO authenticated;
GRANT ALL ON TABLE public.invites TO service_role;


--
-- Name: TABLE prep_items; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.prep_items TO anon;
GRANT ALL ON TABLE public.prep_items TO authenticated;
GRANT ALL ON TABLE public.prep_items TO service_role;


--
-- Name: TABLE prep_list_entries; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.prep_list_entries TO anon;
GRANT ALL ON TABLE public.prep_list_entries TO authenticated;
GRANT ALL ON TABLE public.prep_list_entries TO service_role;


--
-- Name: TABLE prep_lists; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.prep_lists TO anon;
GRANT ALL ON TABLE public.prep_lists TO authenticated;
GRANT ALL ON TABLE public.prep_lists TO service_role;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;


--
-- Name: TABLE recipes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.recipes TO anon;
GRANT ALL ON TABLE public.recipes TO authenticated;
GRANT ALL ON TABLE public.recipes TO service_role;


--
-- Name: TABLE restaurant_units; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.restaurant_units TO anon;
GRANT ALL ON TABLE public.restaurant_units TO authenticated;
GRANT ALL ON TABLE public.restaurant_units TO service_role;


--
-- Name: TABLE restaurants; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.restaurants TO anon;
GRANT ALL ON TABLE public.restaurants TO authenticated;
GRANT ALL ON TABLE public.restaurants TO service_role;


--
-- Name: TABLE translations; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.translations TO anon;
GRANT ALL ON TABLE public.translations TO authenticated;
GRANT ALL ON TABLE public.translations TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--

\unrestrict ziiOQJO2aHHd1KlgzGfamRmHb3LoXRxgaCj55gWPZsVIwxaNNW8g8fp4NHhL5QZ


-- =============================================================================
-- Signup trigger on auth.users (in the auth schema, so not captured above).
-- Inserts a profiles row on signup; the handle_new_user function is defined above.
-- =============================================================================
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


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


-- =============================================================================
-- Security hardening (public-launch). Supersedes the matching pieces of the
-- pg_dump above; run as the LAST step. See docs/database.md.
--
-- Threat model: Supabase's auto-exposed Data API (PostgREST) lets any signed-in
-- user hit these tables directly with the public anon key, governed only by RLS.
-- This app never does that — ALL table access is server-side via the postgres
-- role (Drizzle) or the service_role admin client — so the API surface is pure
-- attack surface. Two problems in the base dump:
--   1. GRANT ALL to anon/authenticated + a column-unrestricted profiles UPDATE
--      policy let a user self-promote their role or change their own
--      restaurant_id and read/write another tenant's data.
--   2. Every "restaurant isolation" policy subqueried public.profiles, whose own
--      SELECT policy subqueried profiles again -> "infinite recursion detected in
--      policy" (42P17); RLS was effectively non-functional for the API role.
-- =============================================================================

-- (1) SECURITY DEFINER helper: returns the caller's restaurant_id WITHOUT
-- re-triggering profiles' RLS (this breaks the recursion). STABLE + pinned
-- search_path.
CREATE OR REPLACE FUNCTION public.current_restaurant_id() RETURNS uuid
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
  AS $fn$ SELECT restaurant_id FROM public.profiles WHERE id = auth.uid() $fn$;
GRANT EXECUTE ON FUNCTION public.current_restaurant_id() TO anon, authenticated, service_role;

-- (2) Rewrite every tenant-isolation policy to call the helper (no self-reference).
DROP POLICY IF EXISTS "users read own restaurant profiles" ON public.profiles;
CREATE POLICY "users read own restaurant profiles" ON public.profiles
  FOR SELECT USING (restaurant_id = public.current_restaurant_id());

DROP POLICY IF EXISTS "restaurant isolation" ON public.glossary_overrides;
CREATE POLICY "restaurant isolation" ON public.glossary_overrides
  USING (restaurant_id = public.current_restaurant_id());
DROP POLICY IF EXISTS "restaurant isolation" ON public.prep_items;
CREATE POLICY "restaurant isolation" ON public.prep_items
  USING (restaurant_id = public.current_restaurant_id());
DROP POLICY IF EXISTS "restaurant isolation" ON public.prep_lists;
CREATE POLICY "restaurant isolation" ON public.prep_lists
  USING (restaurant_id = public.current_restaurant_id());
DROP POLICY IF EXISTS "restaurant isolation" ON public.prep_list_entries;
CREATE POLICY "restaurant isolation" ON public.prep_list_entries
  USING (prep_list_id IN (SELECT id FROM public.prep_lists WHERE restaurant_id = public.current_restaurant_id()));
DROP POLICY IF EXISTS "restaurant isolation" ON public.recipes;
CREATE POLICY "restaurant isolation" ON public.recipes
  USING (restaurant_id = public.current_restaurant_id());
DROP POLICY IF EXISTS "restaurant isolation" ON public.restaurant_units;
CREATE POLICY "restaurant isolation" ON public.restaurant_units
  USING (restaurant_id = public.current_restaurant_id());
DROP POLICY IF EXISTS "restaurant isolation" ON public.translations;
CREATE POLICY "restaurant isolation" ON public.translations
  USING (restaurant_id = public.current_restaurant_id());

DROP POLICY IF EXISTS "users read own restaurant invites" ON public.invites;
CREATE POLICY "users read own restaurant invites" ON public.invites
  FOR SELECT USING (restaurant_id = public.current_restaurant_id());

DROP POLICY IF EXISTS "users see own restaurant" ON public.restaurants;
CREATE POLICY "users see own restaurant" ON public.restaurants
  FOR SELECT USING (id = public.current_restaurant_id());
DROP POLICY IF EXISTS "users update own restaurant" ON public.restaurants;
CREATE POLICY "users update own restaurant" ON public.restaurants
  FOR UPDATE USING (id = public.current_restaurant_id());

-- (3) Take writes away from the API roles entirely (app writes are server-side
-- only). Reads stay SELECT-only, scoped by the policies above. service_role and
-- postgres are unaffected.
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- Future tables created by postgres (Drizzle migrations) must not re-open writes.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE INSERT, UPDATE, DELETE ON TABLES FROM anon, authenticated;
