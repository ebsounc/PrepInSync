ALTER TABLE "prep_items" ADD COLUMN "default_quantity" numeric;--> statement-breakpoint
ALTER TABLE "prep_items" ADD COLUMN "default_unit" text;--> statement-breakpoint
ALTER TABLE "prep_list_entries" ADD COLUMN "cook_note_by" uuid;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "list_default_day" text DEFAULT 'today' NOT NULL;--> statement-breakpoint
ALTER TABLE "prep_list_entries" ADD CONSTRAINT "prep_list_entries_cook_note_by_profiles_id_fk" FOREIGN KEY ("cook_note_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_list_default_day_check" CHECK ("restaurants"."list_default_day" in ('today', 'next_day'));--> statement-breakpoint
-- Data backfill: par_* held the "default amount" in round 2. Move those values to the
-- new default_* columns, then clear par_* so it can mean the par level going forward.
UPDATE "prep_items" SET "default_quantity" = "par_quantity", "default_unit" = "par_unit" WHERE "par_quantity" IS NOT NULL;--> statement-breakpoint
UPDATE "prep_items" SET "par_quantity" = NULL, "par_unit" = NULL;