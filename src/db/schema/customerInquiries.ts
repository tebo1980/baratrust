import { pgTable, uuid, text, integer, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { realityChecks } from './realityCheck';

export const WEBSITE_INQUIRY_CHANNELS = [
  'WEBSITE_CONTACT_FORM',
  'REALITY_CHECK_FUNNEL',
] as const;
export type WebsiteInquiryChannel = (typeof WEBSITE_INQUIRY_CHANNELS)[number];

export const WEBSITE_INQUIRY_SEGMENTS = ['BUSINESS', 'CONSUMER', 'OTHER'] as const;
export type WebsiteInquirySegment = (typeof WEBSITE_INQUIRY_SEGMENTS)[number];

export const WEBSITE_ACK_STATUSES = [
  'DISABLED_PENDING_APPROVAL',
  'NOT_APPLICABLE',
  'SKIPPED_DUPLICATE_RECENT',
  'IN_FLIGHT',
  'SENT',
  'FAILED_RETRYABLE',
  'UNCERTAIN_DELIVERY_LOCKED',
] as const;
export type WebsiteAckStatus = (typeof WEBSITE_ACK_STATUSES)[number];

export const WEBSITE_HUMAN_STATUSES = [
  'AWAITING_HUMAN_REVIEW',
  'UNSUBSCRIBED_OR_SUPPRESSED',
  'SPAM_QUARANTINED',
] as const;
export type WebsiteHumanStatus = (typeof WEBSITE_HUMAN_STATUSES)[number];

/**
 * Durable Neon Postgres customer inquiry table for always-on 24/7 website intake.
 * Persists legitimate inquiries even when Todd & Noelah's local computers are turned off,
 * tracks preapproved acknowledgment state separately from human follow-up state, and
 * feeds Hunter's authenticated pull-based synchronization endpoint.
 */
export const websiteCustomerInquiries = pgTable(
  'website_customer_inquiries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    externalSubmissionKey: text('external_submission_key').notNull().unique(),
    dedupFingerprint: text('dedup_fingerprint').notNull(),

    sourceChannel: text('source_channel').notNull(),
    segment: text('segment').notNull(),
    serviceCategory: text('service_category').notNull(),
    messageClassification: text('message_classification').notNull(),

    customerName: text('customer_name'),
    organizationName: text('organization_name'),
    customerEmail: text('customer_email').notNull(),
    normalizedEmail: text('normalized_email').notNull(),
    customerPhone: text('customer_phone'),
    websiteUrl: text('website_url'),
    cityState: text('city_state'),

    subject: text('subject').notNull(),
    message: text('message').notNull(),

    privacyNoticeAccepted: boolean('privacy_notice_accepted').notNull().default(false),
    privacyNoticeAcceptedAt: timestamp('privacy_notice_accepted_at', { withTimezone: true }),

    realityCheckId: uuid('reality_check_id').references(() => realityChecks.id, {
      onDelete: 'set null',
    }),
    realityCheckShareToken: text('reality_check_share_token'),

    faqMatchedKeys: jsonb('faq_matched_keys').$type<string[]>().notNull().default([]),
    securityFlags: jsonb('security_flags').$type<string[]>().notNull().default([]),

    commitmentBusinessDays: integer('commitment_business_days').notNull().default(2),
    followUpDueAt: timestamp('follow_up_due_at', { withTimezone: true }),

    ackTemplateKey: text('ack_template_key'),
    ackSubject: text('ack_subject'),
    ackBody: text('ack_body'),
    ackStatus: text('ack_status').notNull().default('DISABLED_PENDING_APPROVAL'),
    ackProvider: text('ack_provider'),
    ackMessageId: text('ack_message_id'),
    ackSentAt: timestamp('ack_sent_at', { withTimezone: true }),
    ackError: text('ack_error'),

    humanStatus: text('human_status').notNull().default('AWAITING_HUMAN_REVIEW'),

    submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    syncCursorIdx: index('idx_web_inquiries_sync_cursor').on(table.updatedAt, table.id),
    emailIdx: index('idx_web_inquiries_norm_email').on(table.normalizedEmail, table.submittedAt),
    dedupIdx: index('idx_web_inquiries_dedup').on(table.dedupFingerprint, table.submittedAt),
    rcTokenIdx: index('idx_web_inquiries_rc_token').on(table.realityCheckShareToken),
  })
);
