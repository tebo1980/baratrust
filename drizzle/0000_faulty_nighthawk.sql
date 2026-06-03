CREATE TABLE IF NOT EXISTS "agent_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer,
	"agent_name" text NOT NULL,
	"is_active" text DEFAULT 'true',
	"configuration" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bids" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid,
	"status" text NOT NULL,
	"labor_cost" integer DEFAULT 0 NOT NULL,
	"equipment_cost" integer DEFAULT 0 NOT NULL,
	"materials_cost" integer DEFAULT 0 NOT NULL,
	"grant_money_found" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "businesses" (
	"id" serial PRIMARY KEY NOT NULL,
	"clerk_id" varchar(255) NOT NULL,
	"owner_name" text NOT NULL,
	"business_name" text NOT NULL,
	"industry" text,
	"region" text DEFAULT 'Louisville/New Albany',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "businesses_clerk_id_unique" UNIQUE("clerk_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "grants" (
	"id" serial PRIMARY KEY NOT NULL,
	"state" text NOT NULL,
	"trade" text,
	"amount" text,
	"status" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "iris_sequences" (
	"id" serial PRIMARY KEY NOT NULL,
	"prospect_id" integer NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"current_step" integer DEFAULT 1 NOT NULL,
	"next_run_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "iris_sequences_prospect_id_unique" UNIQUE("prospect_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text,
	"price" text,
	"summary" text,
	"city" text,
	"status" text DEFAULT 'new',
	"created_at" timestamp DEFAULT now(),
	"source" text,
	"original_text" text,
	"draft_reply" text,
	CONSTRAINT "leads_source_unique" UNIQUE("source")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid,
	"role" text NOT NULL,
	"content" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" text,
	"name" text NOT NULL,
	"address" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "self_prospecting_leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_url" text NOT NULL,
	"source_platform" text,
	"subreddit" text,
	"author" text,
	"post_excerpt" text,
	"post_full_text" text,
	"posted_at" timestamp with time zone,
	"intent_score" integer DEFAULT 0 NOT NULL,
	"intent_tier" text,
	"specificity" integer DEFAULT 0 NOT NULL,
	"location_match" integer DEFAULT 0 NOT NULL,
	"recency" integer DEFAULT 0 NOT NULL,
	"budget_signals" integer DEFAULT 0 NOT NULL,
	"total_score" integer DEFAULT 0 NOT NULL,
	"matched_keywords" jsonb DEFAULT '[]',
	"drafted_message" text,
	"no_mention_mode" boolean DEFAULT false,
	"subreddit_note" text,
	"status" text DEFAULT 'new' NOT NULL,
	"notes" text,
	"contractor_slug" text,
	"contractor_name" text,
	"conversion_value_monthly" integer,
	"found_at" timestamp with time zone DEFAULT now(),
	"sent_at" timestamp with time zone,
	"replied_at" timestamp with time zone,
	"converted_at" timestamp with time zone,
	"discarded_at" timestamp with time zone,
	CONSTRAINT "self_prospecting_leads_source_url_unique" UNIQUE("source_url")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wallets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid,
	"status" text NOT NULL,
	"amount_captured" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agent_configs" ADD CONSTRAINT "agent_configs_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bids" ADD CONSTRAINT "bids_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "iris_sequences" ADD CONSTRAINT "iris_sequences_prospect_id_self_prospecting_leads_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "self_prospecting_leads"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wallets" ADD CONSTRAINT "wallets_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
