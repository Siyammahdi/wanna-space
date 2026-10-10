CREATE TABLE "day_plan" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"space_id" uuid NOT NULL,
	"date" date NOT NULL,
	"intention" text DEFAULT '' NOT NULL,
	"focus_task_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "day_plan_focus_max" CHECK (cardinality("day_plan"."focus_task_ids") <= 3),
	CONSTRAINT "day_plan_intention_len" CHECK (char_length("day_plan"."intention") <= 140)
);
--> statement-breakpoint
ALTER TABLE "day_plan" ADD CONSTRAINT "day_plan_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "day_plan_space_date_idx" ON "day_plan" USING btree ("space_id","date");