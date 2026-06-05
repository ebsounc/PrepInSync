CREATE TABLE "restaurant_units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"label" text NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "restaurant_units_restaurant_id_label_unique" UNIQUE("restaurant_id","label")
);
--> statement-breakpoint
ALTER TABLE "prep_items" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "prep_list_entries" ADD COLUMN "cook_note" text;--> statement-breakpoint
ALTER TABLE "restaurant_units" ADD CONSTRAINT "restaurant_units_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_units" ADD CONSTRAINT "restaurant_units_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;