import { pgTable, text, timestamp, uuid, integer, boolean, jsonb } from 'drizzle-orm/pg-core';
import { realityChecks } from './realityCheck';

export type AcquisitionPillar = 'PROTECT' | 'IMPROVE' | 'GROW' | 'SAVE';

export type AssessmentStatus = 'NONE' | 'UNVERIFIED_AI' | 'HUMAN_REVIEWED';

export type ProspectContactMethod =
  | 'EMAIL'
  | 'PHONE'
  | 'IN_PERSON'
  | 'CONTACT_FORM'
  | 'LINKEDIN'
  | 'NONE';

export type ProspectPermissionStatus =
  | 'PUBLIC_BUSINESS_CONTACT'
  | 'INBOUND_REQUEST'
  | 'WARM_REFERRAL'
  | 'PRIOR_RELATIONSHIP'
  | 'NEEDS_VERIFICATION'
  | 'DO_NOT_CONTACT';

export type OutreachDraftStatus =
  | 'NONE'
  | 'AI_DRAFTED'
  | 'EDITED'
  | 'APPROVED_FOR_OUTREACH';

export type ProspectStage =
  | 'RESEARCHED'
  | 'APPROVED_FOR_OUTREACH'
  | 'OUTREACH_SENT'
  | 'CONVERSATION_STARTED'
  | 'MEETING_BOOKED'
  | 'MEETING_ATTENDED'
  | 'CUSTOMER_ACQUIRED'
  | 'NOT_A_FIT'
  | 'OPTED_OUT';

export interface ProspectSourceUrl {
  label: string;
  url: string;
  observedAt?: string;
}

export const acquisitionProspects = pgTable('acquisition_prospects', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessName: text('business_name').notNull(),
  location: text('location').notNull(),
  industry: text('industry').notNull(),
  websiteUrl: text('website_url'),
  sourceUrls: jsonb('source_urls').$type<ProspectSourceUrl[]>().notNull().default([]),
  researchNotes: text('research_notes'),
  realityCheckId: uuid('reality_check_id').references(() => realityChecks.id, {
    onDelete: 'set null',
  }),

  // Fit assessment (AI outputs stay UNVERIFIED_AI until human-reviewed)
  fitScore: integer('fit_score'),
  fitExplanation: text('fit_explanation'),
  assessmentStatus: text('assessment_status').notNull().default('NONE'), // AssessmentStatus

  // Evidence-backed observation or opportunity
  primaryPillar: text('primary_pillar'), // AcquisitionPillar | null
  evidenceObservation: text('evidence_observation'),

  // Legitimately available decision-maker context
  decisionMakerName: text('decision_maker_name'),
  decisionMakerRole: text('decision_maker_role'),
  decisionMakerSource: text('decision_maker_source'),

  // Contact method & permission status (SMS intentionally excluded)
  contactMethod: text('contact_method').notNull().default('NONE'), // ProspectContactMethod
  contactValue: text('contact_value'),
  permissionStatus: text('permission_status').notNull().default('NEEDS_VERIFICATION'), // ProspectPermissionStatus

  // Human-approved outreach draft
  outreachSubject: text('outreach_subject'),
  outreachDraft: text('outreach_draft'),
  draftStatus: text('draft_status').notNull().default('NONE'), // OutreachDraftStatus
  approvedBy: text('approved_by'),
  approvedAt: timestamp('approved_at', { withTimezone: true }),

  // Human review audit
  reviewedBy: text('reviewed_by'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),

  // Opt-out & follow-up controls
  optOut: boolean('opt_out').notNull().default(false),
  optOutAt: timestamp('opt_out_at', { withTimezone: true }),
  optOutReason: text('opt_out_reason'),
  nextFollowUpAt: timestamp('next_follow_up_at', { withTimezone: true }),

  // Sales outcome milestones
  stage: text('stage').notNull().default('RESEARCHED'), // ProspectStage
  outreachSentAt: timestamp('outreach_sent_at', { withTimezone: true }),
  conversationStartedAt: timestamp('conversation_started_at', { withTimezone: true }),
  meetingBookedAt: timestamp('meeting_booked_at', { withTimezone: true }),
  meetingAttendedAt: timestamp('meeting_attended_at', { withTimezone: true }),
  convertedToPulseAt: timestamp('converted_to_pulse_at', { withTimezone: true }),

  createdBy: text('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type ContactLogChannel =
  | 'EMAIL'
  | 'PHONE'
  | 'IN_PERSON'
  | 'CONTACT_FORM'
  | 'LINKEDIN'
  | 'MEETING'
  | 'SYSTEM';

export type ContactLogDirection = 'OUTBOUND' | 'INBOUND' | 'INTERNAL';

export const acquisitionContactLogs = pgTable('acquisition_contact_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  prospectId: uuid('prospect_id')
    .references(() => acquisitionProspects.id, { onDelete: 'cascade' })
    .notNull(),
  actorEmail: text('actor_email').notNull(),
  channel: text('channel').notNull(), // ContactLogChannel (never SMS)
  direction: text('direction').notNull(), // ContactLogDirection
  actionType: text('action_type').notNull(),
  summary: text('summary').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const publicConversionEvents = pgTable('public_conversion_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventName: text('event_name').notNull(),
  surface: text('surface').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const publicRateLimits = pgTable('public_rate_limits', {
  bucketKey: text('bucket_key').primaryKey().notNull(),
  scope: text('scope').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  hitCount: integer('hit_count').notNull().default(1),
});
