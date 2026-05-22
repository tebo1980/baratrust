CREATE TABLE "agent_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" serial NOT NULL,
	"agent_name" text NOT NULL,
	"is_active" text DEFAULT 'true',
	"configuration" text
);
--> statement-breakpoint
CREATE TABLE "bids" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"labor_cost" integer NOT NULL,
	"equipment_cost" integer NOT NULL,
	"materials_cost" integer NOT NULL,
	"grant_money_found" integer DEFAULT 0,
	"status" text DEFAULT 'draft',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "businesses" (
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
CREATE TABLE "grants" (
	"id" serial PRIMARY KEY NOT NULL,
	"state" text NOT NULL,
	"trade" text,
	"amount" text,
	"status" text
);
--> statement-breakpoint
CREATE TABLE "leads" (
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
	CONSTRAINT "leads_title_unique" UNIQUE("title")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid,
	"role" text NOT NULL,
	"content" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" text,
	"name" text NOT NULL,
	"address" text
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"bid_id" uuid NOT NULL,
	"stripe_payment_intent_id" text,
	"amount_authorized" integer NOT NULL,
	"amount_captured" integer DEFAULT 0,
	"status" text DEFAULT 'pending_authorization',
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_configs" ADD CONSTRAINT "agent_configs_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;