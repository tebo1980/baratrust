-- BaraTrust Website Conversion & Acquisition Engine V1
-- Safe, idempotent migration. Does not modify existing tables.
-- Review before applying to production.

CREATE TABLE IF NOT EXISTS "acquisition_prospects" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_name" text NOT NULL,
  "location" text NOT NULL,
  "industry" text NOT NULL,
  "website_url" text,
  "source_urls" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "research_notes" text,
  "reality_check_id" uuid REFERENCES "reality_checks"("id") ON DELETE SET NULL,
  "fit_score" integer,
  "fit_explanation" text,
  "assessment_status" text NOT NULL DEFAULT 'NONE',
  "primary_pillar" text,
  "evidence_observation" text,
  "decision_maker_name" text,
  "decision_maker_role" text,
  "decision_maker_source" text,
  "contact_method" text NOT NULL DEFAULT 'NONE',
  "contact_value" text,
  "permission_status" text NOT NULL DEFAULT 'NEEDS_VERIFICATION',
  "outreach_subject" text,
  "outreach_draft" text,
  "draft_status" text NOT NULL DEFAULT 'NONE',
  "approved_by" text,
  "approved_at" timestamptz,
  "reviewed_by" text,
  "reviewed_at" timestamptz,
  "opt_out" boolean NOT NULL DEFAULT false,
  "opt_out_at" timestamptz,
  "opt_out_reason" text,
  "next_follow_up_at" timestamptz,
  "stage" text NOT NULL DEFAULT 'RESEARCHED',
  "outreach_sent_at" timestamptz,
  "conversation_started_at" timestamptz,
  "meeting_booked_at" timestamptz,
  "meeting_attended_at" timestamptz,
  "converted_to_pulse_at" timestamptz,
  "created_by" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "chk_acq_contact_no_sms" CHECK ("contact_method" IN ('EMAIL', 'PHONE', 'IN_PERSON', 'CONTACT_FORM', 'LINKEDIN', 'NONE')),
  CONSTRAINT "chk_acq_fit_score_range" CHECK ("fit_score" IS NULL OR ("fit_score" >= 0 AND "fit_score" <= 100))
);

CREATE INDEX IF NOT EXISTS "idx_acq_prospects_stage" ON "acquisition_prospects" ("stage");
CREATE INDEX IF NOT EXISTS "idx_acq_prospects_follow_up" ON "acquisition_prospects" ("next_follow_up_at");
CREATE INDEX IF NOT EXISTS "idx_acq_prospects_rc_id" ON "acquisition_prospects" ("reality_check_id");

CREATE TABLE IF NOT EXISTS "acquisition_contact_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "prospect_id" uuid NOT NULL REFERENCES "acquisition_prospects"("id") ON DELETE CASCADE,
  "actor_email" text NOT NULL,
  "channel" text NOT NULL,
  "direction" text NOT NULL,
  "action_type" text NOT NULL,
  "summary" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "chk_acq_log_no_sms" CHECK ("channel" IN ('EMAIL', 'PHONE', 'IN_PERSON', 'CONTACT_FORM', 'LINKEDIN', 'MEETING', 'SYSTEM'))
);

CREATE INDEX IF NOT EXISTS "idx_acq_logs_prospect_id" ON "acquisition_contact_logs" ("prospect_id", "created_at" DESC);

-- Strictly non-PII public website conversion telemetry (never stores email, name, phone, IP, or submitted URL)
CREATE TABLE IF NOT EXISTS "public_conversion_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_name" text NOT NULL,
  "surface" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_pub_conv_events_name" ON "public_conversion_events" ("event_name", "created_at" DESC);

-- Shared serverless-safe rate limit counters (stores HMAC-SHA256 bucket digests only — never raw visitor IPs)
CREATE TABLE IF NOT EXISTS "public_rate_limits" (
  "bucket_key" text PRIMARY KEY NOT NULL,
  "scope" text NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "hit_count" integer NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS "idx_pub_rate_limits_expires" ON "public_rate_limits" ("expires_at");
