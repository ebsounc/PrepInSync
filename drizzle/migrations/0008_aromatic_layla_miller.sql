ALTER TABLE "profiles" ADD COLUMN "theme" text DEFAULT 'system' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "accent_color" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_theme_check" CHECK ("profiles"."theme" in ('light', 'dark', 'system'));