import { pgTable, text, timestamp, uuid, integer, jsonb } from 'drizzle-orm/pg-core';

export type FindingState = 'PASS' | 'FAIL' | 'UNKNOWN';
export type EvidenceLabel = 'AUTO_DETECTED' | 'OWNER_PROVIDED' | 'BARATRUST_REVIEW' | 'OPPORTUNITY_FOUND';
export type ScanStatus = 'pending' | 'completed' | 'failed' | 'blocked' | 'timeout';
export type RealityCheckStatus = 
  | 'NEW'
  | 'AUTO_SCAN_COMPLETE'
  | 'NEEDS_HUMAN_REVIEW'
  | 'IN_REVIEW'
  | 'READY_TO_PUBLISH'
  | 'PUBLISHED'
  | 'pending_review'
  | 'completed'
  | 'archived';

export type CategoryKey = 
  | 'digital_presence'
  | 'customer_journey'
  | 'trust_reputation'
  | 'local_discovery'
  | 'opportunity_capture';

export interface ScoreBreakdown {
  digitalPresence: number | null;   // 0-100 (20% weight, or null if unobservable)
  customerJourney: number | null;   // 0-100 (25% weight, or null if unobservable)
  trustReputation: number | null;   // 0-100 (20% weight, or null if unobservable)
  localDiscovery: number | null;    // 0-100 (20% weight, or null if unobservable)
  opportunityCapture: number | null; // 0-100 (15% weight, or null if unobservable)
  sourceType?: 'standalone_website' | 'hosted_profile';
  platformKey?: string | null;
  platformLabel?: string | null;
  coverage?: {
    overall: number;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT';
    digitalPresence: number;
    customerJourney: number;
    trustReputation: number;
    localDiscovery: number;
    opportunityCapture: number;
  };
}

export interface OwnerQuestionnaireAnswers {
  customerAcquisition?: string;   // Where do most new customers currently come from?
  biggestProblem?: string;        // What is the biggest business problem you want help with right now?
  missedInquiries?: string;       // Do you regularly miss calls, messages, quote requests, catering requests, or other inquiries?
  followUpProcess?: string;       // How do you currently follow up with people who inquire but do not buy immediately?
  currentMarketingSpend?: string; // Are you currently paying for advertising or marketing services?
  repetitiveAdminWaste?: string;  // What repetitive/admin task wastes the most time every week?
  growthOpportunity?: string;     // Is there a product/service/revenue stream you want to grow?
  freeEmployeeRole?: string;      // If you could add one extra employee for free, what would you have them handle?
  additionalNotes?: string;       // Anything else you want us to know?
  evidenceLabel?: EvidenceLabel;  // 'OWNER_PROVIDED'
  submittedAt?: string;
}

export interface HumanEvidenceCitation {
  source?: string;
  sourceUrl?: string;
  note?: string;
  observedAt?: string;
  clientVisible?: boolean;
}

export interface HumanReviewOpportunity {
  id: string;
  title: string;
  type: string;
  description: string;
  suggestedAction?: string;
  potentialImpact?: string;
  evidence?: HumanEvidenceCitation | null;
  evidenceLabel: 'OPPORTUNITY_FOUND';
}

export interface HumanReviewTopFix {
  priority: number; // 1, 2, 3
  title: string;
  whyItMatters: string;
  suggestedAction: string;
  evidence?: HumanEvidenceCitation | null;
  evidenceLabel: 'BARATRUST_REVIEW';
}

export type BrandMessageClarity = 'OBVIOUS' | 'SOMEWHAT_CLEAR' | 'UNCLEAR' | 'UNKNOWN';

export interface BrandRealityInsights {
  apparentBrandMessage?: string;
  messageClarity?: BrandMessageClarity;
  consistencyNotes?: string;
  brandCustomerMismatch?: string;
  strongestBrandOpportunity?: string;
  mysteryShopImpression?: string;
  evidence?: HumanEvidenceCitation | null;
}

export interface CustomerVoiceInsights {
  topLoves?: string[];
  topComplaints?: string[];
  recurringThemes?: string;
  unmarketedStrengths?: string;
  evidence?: HumanEvidenceCitation | null;
}

export type AdPresenceState = 'OBSERVED' | 'NOT_OBSERVED' | 'UNKNOWN';
export type AdFunnelRecommendation =
  | 'CONTINUE'
  | 'IMPROVE_FUNNEL_FIRST'
  | 'DEPRIORITIZE_ADS'
  | 'UNKNOWN';

export interface AdvertisingFunnelInsights {
  adPresence?: AdPresenceState;
  platformsObserved?: string;
  offerSummary?: string;
  landingPageQuality?: string;
  adToFunnelMismatch?: string;
  recommendation?: AdFunnelRecommendation;
  recommendationNote?: string;
  evidence?: HumanEvidenceCitation | null;
}

export interface GhostFootprintItem {
  id: string;
  assetType: string;
  summary: string;
  source?: string;
  sourceUrl?: string;
  evidenceNote?: string;
  observedAt?: string;
  clientVisible?: boolean;
  customerImpact?: string;
  recommendedFix?: string;
  evidenceLabel?: 'BARATRUST_REVIEW';
}

export interface HumanIntelligenceLayer {
  brandReality?: BrandRealityInsights | null;
  customerVoice?: CustomerVoiceInsights | null;
  advertisingFunnel?: AdvertisingFunnelInsights | null;
  ghostFootprint?: GhostFootprintItem[];
}

export interface CompetitorEntry {
  name: string;
  whySelected: string;
  competitorStrengths: string;
  clientStrengths: string;
}

export const realityChecks = pgTable('reality_checks', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessName: text('business_name'),
  website: text('website').notNull(),
  normalizedUrl: text('normalized_url'),
  cityState: text('city_state'),
  ownerName: text('owner_name'),
  email: text('email'),
  phone: text('phone'),
  businessType: text('business_type'),
  primaryHeadache: text('primary_headache'),
  
  // Status tracking: 'NEW' | 'AUTO_SCAN_COMPLETE' | 'NEEDS_HUMAN_REVIEW' | 'IN_REVIEW' | 'READY_TO_PUBLISH' | 'PUBLISHED'
  status: text('status').notNull().default('NEW'),
  scanStatus: text('scan_status').notNull().default('pending'),
  scanFailureReason: text('scan_failure_reason'),
  
  // Scoring
  overallScore: integer('overall_score'),
  scoreBreakdown: jsonb('score_breakdown').$type<ScoreBreakdown>(),
  
  // Unguessable token for shareable /report/[shareToken]
  shareToken: text('share_token').notNull().unique(),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const scanFindings = pgTable('scan_findings', {
  id: uuid('id').defaultRandom().primaryKey(),
  realityCheckId: uuid('reality_check_id')
    .references(() => realityChecks.id, { onDelete: 'cascade' })
    .notNull(),
  category: text('category').notNull(), // CategoryKey
  checkKey: text('check_key').notNull(),
  title: text('title').notNull(),
  state: text('state').notNull(), // FindingState: 'PASS' | 'FAIL' | 'UNKNOWN'
  scoreContribution: integer('score_contribution').notNull().default(0),
  maxPoints: integer('max_points').notNull().default(10),
  observedValue: jsonb('observed_value'),
  evidenceSource: text('evidence_source').notNull(), // 'HTTP_PROBE' | 'HTML_PARSER' | 'DNS' | 'SYSTEM'
  evidenceLabel: text('evidence_label').notNull().default('AUTO_DETECTED'), // EvidenceLabel
  supportingDetail: text('supporting_detail'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const ownerResponses = pgTable('owner_responses', {
  id: uuid('id').defaultRandom().primaryKey(),
  realityCheckId: uuid('reality_check_id')
    .references(() => realityChecks.id, { onDelete: 'cascade' })
    .notNull(),
  responses: jsonb('responses').$type<OwnerQuestionnaireAnswers>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export interface RealityCheckReportContent {
  executiveSummary: string;
  whatsWorking: string[];
  whatsGettingInTheWay: string[];
  topFixesSummary: string;
  notWorthSpendingOnSummary: string;
  findabilitySummary: string;
  reputationSummary: string;
  socialSummary: string;
  competitorSummary: string;
  lostOpportunitySummary: string;
  opportunitiesSummary: string;
  brandRealitySummary?: string;
  customerVoiceSummary?: string;
  advertisingFunnelSummary?: string;
  ghostFootprintSummary?: string;
  closingNote: string;
  frozenTopFixes?: HumanReviewTopFix[];
  frozenOpportunities?: HumanReviewOpportunity[];
  frozenHumanIntelligence?: HumanIntelligenceLayer | null;
}

export interface ReportAuditMetadata {
  geminiDraftGeneratedAt?: string | null;
  geminiModelUsed?: string | null;
  lastReportEditAt?: string | null;
  reportPublishedAt?: string | null;
  publishingOperator?: string | null;
  deliveryEmailSentAt?: string | null;
  deliveryEmailMessageId?: string | null;
  deliveryEmailStatus?: string | null;
}

export const humanReviews = pgTable('human_reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  realityCheckId: uuid('reality_check_id')
    .references(() => realityChecks.id, { onDelete: 'cascade' })
    .notNull(),
  reviewerEmail: text('reviewer_email'),
  reviewerName: text('reviewer_name'),
  status: text('status').notNull().default('draft'), // 'draft' | 'in_review' | 'ready_to_publish' | 'published'
  findabilityTest: text('findability_test'),
  reputationSummary: text('reputation_summary'),
  socialPresenceReview: text('social_presence_review'),
  competitorComparison: text('competitor_comparison'),
  lostOpportunityHunt: text('lost_opportunity_hunt'),
  opportunitiesFound: jsonb('opportunities_found').$type<HumanReviewOpportunity[]>(),
  topFixes: jsonb('top_fixes').$type<HumanReviewTopFix[]>(),
  notSpendMoneyOn: text('not_spend_money_on'),
  toddNotes: text('todd_notes'),
  humanIntelligence: jsonb('human_intelligence').$type<HumanIntelligenceLayer>(),
  reportDraft: jsonb('report_draft').$type<RealityCheckReportContent>(),
  reportAudit: jsonb('report_audit').$type<ReportAuditMetadata>(),
  publishedReport: jsonb('published_report').$type<RealityCheckReportContent>(),
  emailDeliveredAt: timestamp('email_delivered_at', { withTimezone: true }),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
