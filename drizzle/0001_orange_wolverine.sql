CREATE TABLE "inbound_leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text,
	"job_scope" text,
	"estimated_pay" integer,
	"region" text,
	"source_url" text,
	"status" text DEFAULT 'new'
);
