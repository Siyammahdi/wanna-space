ALTER TABLE "task" ADD COLUMN "parent_id" uuid;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "due_time" time;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_parent_id_task_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_parent_id_idx" ON "task" USING btree ("parent_id");