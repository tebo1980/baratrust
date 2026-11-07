-- BaraTrust Website Conversion & Acquisition Engine V1 — Guarded Rollback Script
-- NOTE: Because 0001_acquisition_engine_v1.sql is 100% additive (zero changes to existing tables),
-- rolling back the Vercel application deployment does NOT require dropping these tables.
-- Run this script ONLY if you explicitly want to remove the 4 additive Acquisition Engine V1 tables,
-- and ONLY when acquisition_prospects / acquisition_contact_logs hold no operator records to keep.

DO $$
DECLARE
  prospect_count bigint := 0;
  log_count bigint := 0;
BEGIN
  IF to_regclass('public.acquisition_prospects') IS NOT NULL THEN
    EXECUTE 'SELECT COUNT(*) FROM "public"."acquisition_prospects"' INTO prospect_count;
  END IF;

  IF to_regclass('public.acquisition_contact_logs') IS NOT NULL THEN
    EXECUTE 'SELECT COUNT(*) FROM "public"."acquisition_contact_logs"' INTO log_count;
  END IF;

  IF prospect_count > 0 OR log_count > 0 THEN
    RAISE EXCEPTION
      'Refusing destructive rollback: acquisition_prospects (%) or acquisition_contact_logs (%) is non-empty. Export or rename tables before dropping.',
      prospect_count, log_count;
  END IF;

  DROP TABLE IF EXISTS "public"."public_rate_limits";
  DROP TABLE IF EXISTS "public"."public_conversion_events";
  DROP TABLE IF EXISTS "public"."acquisition_contact_logs";
  DROP TABLE IF EXISTS "public"."acquisition_prospects";
END $$;
