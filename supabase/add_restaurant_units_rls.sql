-- ---------------------------------------------------------------------------
-- RLS: restaurant_units
-- Custom units added by a restaurant. Same restaurant-isolation model as
-- prep_items: a user can only see/modify their own restaurant's units.
-- Run after migration 0002 (which creates the table).
-- ---------------------------------------------------------------------------
ALTER TABLE restaurant_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "restaurant isolation"
  ON restaurant_units FOR ALL
  USING (restaurant_id = (SELECT restaurant_id FROM profiles WHERE id = auth.uid()));
