-- Add optional cover image to prep items (thumbnail in list views)
ALTER TABLE prep_items ADD COLUMN image_url text;

-- Add optional cover image to recipes (hero photo shown above the recipe)
ALTER TABLE recipes ADD COLUMN image_url text;

-- Convert instructions from plain text to a JSONB array of steps.
-- Each step: { text?: string, image_url?: string } — either field alone is valid.
-- Wraps any existing text rows into a single-step array so no data is lost.
ALTER TABLE recipes
  ALTER COLUMN instructions TYPE jsonb
  USING CASE
    WHEN instructions IS NOT NULL AND instructions <> ''
      THEN jsonb_build_array(jsonb_build_object('text', instructions))
    ELSE '[]'::jsonb
  END;
