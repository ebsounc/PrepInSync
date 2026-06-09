ALTER TABLE "prep_list_entries" ADD COLUMN "notes_source_language" text DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE "prep_list_entries" ADD COLUMN "cook_note_source_language" text DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE "prep_lists" ADD COLUMN "source_language" text DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE "restaurant_units" ADD COLUMN "source_language" text DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE "prep_list_entries" ADD CONSTRAINT "ple_notes_source_language_check" CHECK ("prep_list_entries"."notes_source_language" in ('en', 'es'));--> statement-breakpoint
ALTER TABLE "prep_list_entries" ADD CONSTRAINT "ple_cook_note_source_language_check" CHECK ("prep_list_entries"."cook_note_source_language" in ('en', 'es'));--> statement-breakpoint
ALTER TABLE "prep_lists" ADD CONSTRAINT "prep_lists_source_language_check" CHECK ("prep_lists"."source_language" in ('en', 'es'));--> statement-breakpoint
ALTER TABLE "restaurant_units" ADD CONSTRAINT "restaurant_units_source_language_check" CHECK ("restaurant_units"."source_language" in ('en', 'es'));