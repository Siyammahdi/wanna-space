CREATE TYPE "public"."time_format" AS ENUM('12h', '24h');--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"week_starts_on" smallint DEFAULT 6 NOT NULL,
	"time_format" time_format DEFAULT '12h' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_settings_week_starts_on" CHECK ("user_settings"."week_starts_on" between 0 and 6)
);
--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;