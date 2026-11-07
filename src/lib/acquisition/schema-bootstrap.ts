import { sql } from 'drizzle-orm';
import { db } from '@/db';

let bootstrapped = false;
let bootstrapPromise: Promise<void> | null = null;

/**
 * Idempotently ensures the Acquisition Engine V1 tables, CHECK constraints, and indexes
 * exist in PostgreSQL (executing one SQL command per Neon HTTP roundtrip).
 * Skipped in unit/integration test mode where `node:sqlite` harness creates tables from Drizzle schema.
 * Matches `drizzle/0001_acquisition_engine_v1.sql` 1-to-1 and never modifies existing tables.
 */
export async function ensureAcquisitionSchema(): Promise<void> {
  if (bootstrapped) return;
  if (process.env.NODE_ENV === 'test' || process.env.TEST_ENV === 'true') {
    bootstrapped = true;
    return;
  }

  if (bootstrapPromise) {
    return bootstrapPromise;
  }

  bootstrapPromise = (async () => {
    try {
      await db.execute(sql`
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
        )
      `);

      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS "idx_acq_prospects_stage" ON "acquisition_prospects" ("stage")`
      );
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS "idx_acq_prospects_follow_up" ON "acquisition_prospects" ("next_follow_up_at")`
      );
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS "idx_acq_prospects_rc_id" ON "acquisition_prospects" ("reality_check_id")`
      );

      await db.execute(sql`
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
        )
      `);

      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS "idx_acq_logs_prospect_id" ON "acquisition_contact_logs" ("prospect_id", "created_at" DESC)`
      );

      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "public_conversion_events" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "event_name" text NOT NULL,
          "surface" text NOT NULL,
          "created_at" timestamptz NOT NULL DEFAULT now()
        )
      `);

      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS "idx_pub_conv_events_name" ON "public_conversion_events" ("event_name", "created_at" DESC)`
      );

      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "public_rate_limits" (
          "bucket_key" text PRIMARY KEY NOT NULL,
          "scope" text NOT NULL,
          "expires_at" timestamptz NOT NULL,
          "hit_count" integer NOT NULL DEFAULT 1
        )
      `);

      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS "idx_pub_rate_limits_expires" ON "public_rate_limits" ("expires_at")`
      );

      bootstrapped = true;
    } finally {
      bootstrapPromise = null;
    }
  })();

  return bootstrapPromise;
}
