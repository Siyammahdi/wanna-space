CREATE TABLE "asset_trash" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"space_id" uuid NOT NULL,
	"public_id" text NOT NULL,
	"asset" jsonb NOT NULL,
	"trashed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "cover" jsonb;--> statement-breakpoint
ALTER TABLE "asset_trash" ADD CONSTRAINT "asset_trash_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "asset_trash_space_public_id_idx" ON "asset_trash" USING btree ("space_id","public_id");--> statement-breakpoint
CREATE INDEX "asset_trash_trashed_at_idx" ON "asset_trash" USING btree ("trashed_at");