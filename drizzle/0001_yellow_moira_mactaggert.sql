CREATE TABLE IF NOT EXISTS "human_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reality_check_id" uuid NOT NULL,
	"reviewer_email" text,
	"reviewer_name" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"findability_test" text,
	"reputation_summary" text,
	"social_presence_review" text,
	"competitor_comparison" text,
	"lost_opportunity_hunt" text,
	"opportunities_found" jsonb,
	"top_fixes" jsonb,
	"not_spend_money_on" text,
	"todd_notes" text,
	"report_draft" jsonb,
	"report_audit" jsonb,
	"published_report" jsonb,
	"email_delivered_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "owner_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reality_check_id" uuid NOT NULL,
	"responses" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reality_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_name" text,
	"website" text NOT NULL,
	"normalized_url" text,
	"city_state" text,
	"owner_name" text,
	"email" text,
	"phone" text,
	"business_type" text,
	"primary_headache" text,
	"status" text DEFAULT 'NEW' NOT NULL,
	"scan_status" text DEFAULT 'pending' NOT NULL,
	"scan_failure_reason" text,
	"overall_score" integer,
	"score_breakdown" jsonb,
	"share_token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reality_checks_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scan_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reality_check_id" uuid NOT NULL,
	"category" text NOT NULL,
	"check_key" text NOT NULL,
	"title" text NOT NULL,
	"state" text NOT NULL,
	"score_contribution" integer DEFAULT 0 NOT NULL,
	"max_points" integer DEFAULT 10 NOT NULL,
	"observed_value" jsonb,
	"evidence_source" text NOT NULL,
	"evidence_label" text DEFAULT 'AUTO_DETECTED' NOT NULL,
	"supporting_detail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "owner_email" text;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "tier" text DEFAULT 'Standard';--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "stripe_subscription_id" text;--> statement-breakpoint
ALTER TABLE "reality_checks" ALTER COLUMN "business_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "reality_checks" ALTER COLUMN "city_state" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "reality_checks" ALTER COLUMN "owner_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "reality_checks" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "human_reviews" ADD CONSTRAINT "human_reviews_reality_check_id_reality_checks_id_fk" FOREIGN KEY ("reality_check_id") REFERENCES "reality_checks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "owner_responses" ADD CONSTRAINT "owner_responses_reality_check_id_reality_checks_id_fk" FOREIGN KEY ("reality_check_id") REFERENCES "reality_checks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scan_findings" ADD CONSTRAINT "scan_findings_reality_check_id_reality_checks_id_fk" FOREIGN KEY ("reality_check_id") REFERENCES "reality_checks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

