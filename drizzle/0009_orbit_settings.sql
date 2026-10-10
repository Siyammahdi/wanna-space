CREATE TYPE "public"."project_status" AS ENUM('planning', 'active', 'paused', 'complete');--> statement-breakpoint
CREATE TABLE "project_stage" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"space_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"sort_key" text NOT NULL,
	"wip_limit" smallint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_stage_wip_limit" CHECK ("project_stage"."wip_limit" between 1 and 99)
);
--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "auto_start_focus" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "daily_focus_goal" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "start_room" text DEFAULT 'today' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "hidden_rooms" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "capture_project_id" uuid;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "default_stages" text[] DEFAULT '{"To do","In progress","Review"}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "icon" text;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "status" "project_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "target_date" date;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "stage_id" uuid;--> statement-breakpoint
ALTER TABLE "project_stage" ADD CONSTRAINT "project_stage_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_stage" ADD CONSTRAINT "project_stage_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_stage_project_id_idx" ON "project_stage" USING btree ("project_id");--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_capture_project_id_project_id_fk" FOREIGN KEY ("capture_project_id") REFERENCES "public"."project"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_stage_id_project_stage_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."project_stage"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_stage_id_idx" ON "task" USING btree ("stage_id");--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_daily_focus_goal" CHECK ("user_settings"."daily_focus_goal" between 0 and 720);--> statement-breakpoint
INSERT INTO "project_stage" ("space_id", "project_id", "name", "sort_key")
SELECT p."space_id", p."id", s."name", s."sort_key"
FROM "project" p
CROSS JOIN (VALUES ('To do', 'a0'), ('In progress', 'a1'), ('Review', 'a2')) AS s("name", "sort_key");