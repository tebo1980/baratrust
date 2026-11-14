-- BaraTrust Phase C: Always-On Customer Receptionist Integration
-- Additive, idempotent schema migration for durable 24/7 customer inquiry persistence and Hunter pull-sync.

CREATE TABLE IF NOT EXISTS "website_customer_inquiries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "external_submission_key" text UNIQUE NOT NULL,
  "dedup_fingerprint" text NOT NULL,
  "source_channel" text NOT NULL,
  "segment" text NOT NULL,
  "service_category" text NOT NULL,
  "message_classification" text NOT NULL,
  "customer_name" text,
  "organization_name" text,
  "customer_email" text NOT NULL,
  "normalized_email" text NOT NULL,
  "customer_phone" text,
  "website_url" text,
  "city_state" text,
  "subject" text NOT NULL,
  "message" text NOT NULL,
  "privacy_notice_accepted" boolean NOT NULL DEFAULT false,
  "privacy_notice_accepted_at" timestamptz,
  "reality_check_id" uuid REFERENCES "reality_checks"("id") ON DELETE SET NULL,
  "reality_check_share_token" text,
  "faq_matched_keys" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "security_flags" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "commitment_business_days" integer NOT NULL DEFAULT 2,
  "follow_up_due_at" timestamptz,
  "ack_template_key" text,
  "ack_subject" text,
  "ack_body" text,
  "ack_status" text NOT NULL DEFAULT 'DISABLED_PENDING_APPROVAL',
  "ack_provider" text,
  "ack_message_id" text,
  "ack_sent_at" timestamptz,
  "ack_error" text,
  "human_status" text NOT NULL DEFAULT 'AWAITING_HUMAN_REVIEW',
  "submitted_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "chk_web_inq_segment" CHECK ("segment" IN ('BUSINESS', 'CONSUMER', 'OTHER')),
  CONSTRAINT "chk_web_inq_channel" CHECK ("source_channel" IN ('WEBSITE_CONTACT_FORM', 'REALITY_CHECK_FUNNEL')),
  CONSTRAINT "chk_web_inq_ack_status" CHECK ("ack_status" IN ('DISABLED_PENDING_APPROVAL', 'NOT_APPLICABLE', 'SKIPPED_DUPLICATE_RECENT', 'IN_FLIGHT', 'SENT', 'FAILED_RETRYABLE', 'UNCERTAIN_DELIVERY_LOCKED')),
  CONSTRAINT "chk_web_inq_human_status" CHECK ("human_status" IN ('AWAITING_HUMAN_REVIEW', 'UNSUBSCRIBED_OR_SUPPRESSED', 'SPAM_QUARANTINED'))
);

CREATE INDEX IF NOT EXISTS "idx_web_inquiries_sync_cursor"
  ON "website_customer_inquiries" ("updated_at", "id");

CREATE INDEX IF NOT EXISTS "idx_web_inquiries_norm_email"
  ON "website_customer_inquiries" ("normalized_email", "submitted_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_web_inquiries_dedup"
  ON "website_customer_inquiries" ("dedup_fingerprint", "submitted_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_web_inquiries_rc_token"
  ON "website_customer_inquiries" ("reality_check_share_token");
