-- profiles: name, phone, and soft-delete flag
ALTER TABLE profiles ADD COLUMN first_name text NOT NULL;
ALTER TABLE profiles ADD COLUMN last_name text NOT NULL;
ALTER TABLE profiles ADD COLUMN phone text;
ALTER TABLE profiles ADD COLUMN is_active boolean NOT NULL DEFAULT true;

-- restaurants: timezone required for accurate date calculations per restaurant
ALTER TABLE restaurants ADD COLUMN timezone text NOT NULL;

-- prep_items: optional par level (target amount to have prepped per shift)
ALTER TABLE prep_items ADD COLUMN par_quantity numeric;
ALTER TABLE prep_items ADD COLUMN par_unit text;

-- prep_list_entries: drop assigned_to (v2), add is_starred for priority ordering
ALTER TABLE prep_list_entries DROP COLUMN assigned_to;
ALTER TABLE prep_list_entries ADD COLUMN is_starred boolean NOT NULL DEFAULT false;
