-- Expand role values from chef/prep_cook to 4-tier kitchen hierarchy.
-- The role column is plain text (no Postgres ENUM type), so no type to drop/recreate.
-- Existing rows (none in dev) would need a data migration if this were a live table.

-- Add permission flag. True by default for head_chef and sous_chef; set at insert time
-- by app logic. Sous chefs and head chefs can toggle this for any profile in their restaurant.
ALTER TABLE profiles ADD COLUMN can_create_lists boolean NOT NULL DEFAULT false;
