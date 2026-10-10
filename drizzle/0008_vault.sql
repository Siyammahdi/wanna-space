CREATE TYPE "public"."vault_item_kind" AS ENUM('link', 'image', 'file', 'snippet', 'note');--> statement-breakpoint
CREATE TABLE "vault_collection" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"space_id" uuid NOT NULL,
	"name" text NOT NULL,
	"sort_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vault_item" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"space_id" uuid NOT NULL,
	"collection_id" uuid,
	"kind" "vault_item_kind" NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"url" text,
	"site_name" text,
	"icon_url" text,
	"preview_url" text,
	"language" text,
	"asset" jsonb,
	"colors" text[] DEFAULT '{}'::text[] NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"search" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple', "vault_item"."title" || ' ' || "vault_item"."body" || ' ' || coalesce("vault_item"."url", '') || ' ' || coalesce("vault_item"."site_name", '') || ' ' || coalesce("vault_item"."asset" ->> 'filename', ''))) STORED,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vault_collection" ADD CONSTRAINT "vault_collection_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vault_item" ADD CONSTRAINT "vault_item_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vault_item" ADD CONSTRAINT "vault_item_collection_id_vault_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."vault_collection"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "vault_collection_space_idx" ON "vault_collection" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "vault_item_space_created_idx" ON "vault_item" USING btree ("space_id","created_at");--> statement-breakpoint
CREATE INDEX "vault_item_collection_idx" ON "vault_item" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "vault_item_search_idx" ON "vault_item" USING gin ("search");--> statement-breakpoint
CREATE INDEX "vault_item_tags_idx" ON "vault_item" USING gin ("tags");