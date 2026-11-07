import { sql } from 'drizzle-orm';
import { db } from '@/db';

let bootstrapped = false;

/**
 * Idempotently ensures the Acquisition Engine V1 tables exist in PostgreSQL.
 * Skipped in unit/integration test mode where `node:sqlite` harness creates tables from Drizzle schema.
 * Matches `drizzle/0001_acquisition_engine_v1.sql` 1-to-1 and never modifies existing tables.
 */
export async function ensureAcquisitionSchema(): Promise<void> {
  if (bootstrapped) return;
  if (process.env.NODE_ENV === 'test' || process.env.TEST_ENV === 'true') {
    bootstrapped = true;
    return;
  }

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
      "updated_at" timestamptz NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "acquisition_contact_logs" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "prospect_id" uuid NOT NULL REFERENCES "acquisition_prospects"("id") ON DELETE CASCADE,
      "actor_email" text NOT NULL,
      "channel" text NOT NULL,
      "direction" text NOT NULL,
      "action_type" text NOT NULL,
      "summary" text NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "public_conversion_events" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "event_name" text NOT NULL,
      "surface" text NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )
  `);

  bootstrapped = true;
}
