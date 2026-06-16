CREATE TABLE IF NOT EXISTS "agent_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" text NOT NULL,
	"reference_id" uuid,
	"action_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE IF NOT EXISTS "cogs_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" integer NOT NULL,
	"total_revenue" integer DEFAULT 0 NOT NULL,
	"material_cost" integer DEFAULT 0 NOT NULL,
	"labor_cost" integer DEFAULT 0 NOT NULL,
	"net_profit_margin" text NOT NULL,
	"margin_alert" boolean DEFAULT false,
	"analyzed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fleet_vehicles" (
	"id" serial PRIMARY KEY NOT NULL,
	"truck_identifier" text NOT NULL,
	"assigned_technician" text,
	"current_odometer" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'Available',
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fleet_vehicles_truck_identifier_unique" UNIQUE("truck_identifier")
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
CREATE TABLE IF NOT EXISTS "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text,
	"price" text,
	"summary" text,
	"city" text,
	"trade_sector" text,
	"prospect_contact" text,
	"geographic_metadata" text,
	"status" text DEFAULT 'Inbound Intercepts',
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
CREATE TABLE IF NOT EXISTS "mileage_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" integer NOT NULL,
	"lead_id" integer NOT NULL,
	"trip_route" text,
	"estimated_mileage" integer DEFAULT 0,
	"logged_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "parts_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" integer NOT NULL,
	"required_materials" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"supplier_name" text,
	"quoted_price" integer DEFAULT 0,
	"status" text DEFAULT 'Sourcing' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
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
CREATE TABLE IF NOT EXISTS "wallet_balances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"balance_cents" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'Active' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wallet_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"amount_cents" integer NOT NULL,
	"type" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
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
CREATE TABLE IF NOT EXISTS "warehouse_inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"part_number" text NOT NULL,
	"part_name" text NOT NULL,
	"category" text NOT NULL,
	"stock_quantity" integer DEFAULT 0 NOT NULL,
	"reorder_threshold" integer DEFAULT 5 NOT NULL,
	"unit_cost" integer DEFAULT 0 NOT NULL,
	"last_restocked" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "warehouse_inventory_part_number_unique" UNIQUE("part_number")
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
 ALTER TABLE "cogs_ledger" ADD CONSTRAINT "cogs_ledger_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE no action ON UPDATE no action;
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
 ALTER TABLE "mileage_logs" ADD CONSTRAINT "mileage_logs_vehicle_id_fleet_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "fleet_vehicles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mileage_logs" ADD CONSTRAINT "mileage_logs_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "parts_orders" ADD CONSTRAINT "parts_orders_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wallets" ADD CONSTRAINT "wallets_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
