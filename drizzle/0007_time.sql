CREATE TYPE "public"."time_entry_source" AS ENUM('pomodoro', 'stopwatch', 'manual');--> statement-breakpoint
CREATE TYPE "public"."timer_mode" AS ENUM('pomodoro', 'stopwatch');--> statement-breakpoint
CREATE TYPE "public"."timer_phase" AS ENUM('focus', 'short_break', 'long_break');--> statement-breakpoint
CREATE TABLE "active_timer" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"space_id" uuid NOT NULL,
	"mode" timer_mode DEFAULT 'pomodoro' NOT NULL,
	"phase" timer_phase DEFAULT 'focus' NOT NULL,
	"task_id" uuid,
	"note" text DEFAULT '' NOT NULL,
	"run_started_at" timestamp with time zone,
	"elapsed_ms" integer DEFAULT 0 NOT NULL,
	"session_started_at" timestamp with time zone,
	"rounds" smallint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "time_entry" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"space_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"task_id" uuid,
	"source" time_entry_source NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone NOT NULL,
	"seconds" integer NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "time_entry_seconds" CHECK ("time_entry"."seconds" between 1 and 86400),
	CONSTRAINT "time_entry_range" CHECK ("time_entry"."ended_at" >= "time_entry"."started_at")
);
--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "focus_minutes" smallint DEFAULT 25 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "short_break_minutes" smallint DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "long_break_minutes" smallint DEFAULT 15 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "long_break_every" smallint DEFAULT 4 NOT NULL;--> statement-breakpoint
ALTER TABLE "active_timer" ADD CONSTRAINT "active_timer_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "active_timer" ADD CONSTRAINT "active_timer_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "active_timer" ADD CONSTRAINT "active_timer_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entry" ADD CONSTRAINT "time_entry_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entry" ADD CONSTRAINT "time_entry_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entry" ADD CONSTRAINT "time_entry_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "time_entry_space_started_idx" ON "time_entry" USING btree ("space_id","started_at");--> statement-breakpoint
CREATE INDEX "time_entry_task_idx" ON "time_entry" USING btree ("task_id");--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_focus_minutes" CHECK ("user_settings"."focus_minutes" between 5 and 180);--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_short_break_minutes" CHECK ("user_settings"."short_break_minutes" between 1 and 60);--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_long_break_minutes" CHECK ("user_settings"."long_break_minutes" between 1 and 90);--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_long_break_every" CHECK ("user_settings"."long_break_every" between 2 and 12);