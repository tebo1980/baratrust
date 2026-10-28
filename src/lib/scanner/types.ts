export type FindingState = 'PASS' | 'FAIL' | 'UNKNOWN';
export type EvidenceLabel = 'AUTO_DETECTED' | 'OWNER_PROVIDED' | 'BARATRUST_REVIEW' | 'OPPORTUNITY_FOUND';
export type ScanStatus = 'pending' | 'completed' | 'failed' | 'blocked' | 'timeout';

export type SourceType = 'standalone_website' | 'hosted_profile';
export type HostedPlatformKey =
  | 'facebook'
  | 'google_business'
  | 'instagram'
  | 'yelp'
  | 'linkedin'
  | 'tiktok'
  | 'nextdoor'
  | 'thumbtack'
  | 'angi'
  | 'bbb';

export interface PlatformClassification {
  sourceType: SourceType;
  isHostedProfile: boolean;
  platformKey: HostedPlatformKey | null;
  platformLabel: string | null;
}

export type CategoryKey = 
  | 'digital_presence'
  | 'customer_journey'
  | 'trust_reputation'
  | 'local_discovery'
  | 'opportunity_capture';

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT';

export interface CheckDefinition {
  key: string;
  category: CategoryKey;
  title: string;
  maxPoints: number;
  description: string;
  isInformational?: boolean;
}

export type BrowserRenderViewportStatus =
  | 'RENDERED'
  | 'BLOCKED'
  | 'TIMEOUT'
  | 'FAILED'
  | 'SKIPPED';

export type BrowserRenderOverallStatus =
  | 'COMPLETED'
  | 'BLOCKED'
  | 'FAILED'
  | 'SKIPPED'
  | 'UNAVAILABLE';

export type BrowserCheckClassification = 'AUTO' | 'VERIFY' | 'HUMAN';

export interface BrowserRenderedSignals {
  telLinks?: string[];
  mailtoLinks?: string[];
  visiblePhoneNumbers?: string[];
  visibleAddressSignals?: string[];
  detectedPricingSignals?: boolean;
  pricingSnippets?: string[];
  detectedMenuOrServices?: boolean;
  detectedAboutOrTeamKeywords?: boolean;
  hasPrivacyOrTermsLink?: boolean;
  socialLinks?: Array<{ platform: string; url: string }>;
  hasMapEmbed?: boolean;
  hasForms?: boolean;
  hasLeadCaptureForm?: boolean;
  detectedQuoteOrCateringKeywords?: boolean;
  detectedBookingSignals?: boolean;
  detectedReviewOrTestimonialKeywords?: boolean;
  searchableText?: string;
}

export interface BrowserViewportEvidence {
  viewportLabel: 'desktop' | 'mobile';
  viewport: { width: number; height: number };
  status: BrowserRenderViewportStatus;
  failureReason?: string;
  finalUrl?: string;
  httpStatus?: number | null;
  renderDurationMs?: number;
  pageTitle?: string | null;
  documentDimensions?: { width: number; height: number };
  horizontalOverflowPx?: number;
  hasHorizontalOverflow?: boolean;
  visibleTextLength?: number;
  isNearEmptyRender?: boolean;
  navigationObserved?: boolean;
  primaryCtaObserved?: boolean;
  primaryCtaCandidates?: string[];
  majorHeadings?: string[];
  visibleControlsCount?: number;
  visibleTopBarControls?: string[];
  clippedTextElements?: Array<{
    text: string;
    left: number;
    right: number;
    viewportWidth: number;
  }>;
  mediaTextOverlaps?: Array<{
    text: string;
    mediaSrc: string;
    overlapRatio: number;
  }>;
  smallTapTargets?: Array<{
    label: string;
    width: number;
    height: number;
  }>;
  renderedSignals?: BrowserRenderedSignals;
  consoleOrPageErrors?: string[];
  screenshotDataUrl?: string | null;
  screenshotBytes?: number;
  hasScreenshot?: boolean;
  screenshotOmittedReason?: string | null;
  screenshotPrunedAt?: string | null;
  screenshotPruneReason?: string | null;
  notes?: string[];
}

export interface BrowserComparisonEvidence {
  materiallyDifferent: boolean;
  missingDesktopElements: string[];
  missingMobileElements: string[];
  objectiveWarnings: string[];
}

export interface BrowserCheckItem {
  key: string;
  title: string;
  classification: BrowserCheckClassification;
  state: 'PASS' | 'ATTENTION' | 'VERIFY' | 'UNKNOWN';
  detail: string;
}

export interface BrowserRenderedEvidence {
  status: BrowserRenderOverallStatus;
  capturedAt: string;
  totalDurationMs?: number;
  desktop: BrowserViewportEvidence;
  mobile: BrowserViewportEvidence;
  comparison: BrowserComparisonEvidence;
  checks: BrowserCheckItem[];
}

export interface VisualReviewPromptContext {
  capturedAt: string;
  hasDesktopScreenshot: boolean;
  hasMobileScreenshot: boolean;
  desktopViewport: { width: number; height: number };
  mobileViewport: { width: number; height: number };
  objectiveWarnings: string[];
  candidateQuestionsForReview: string[];
}

export interface EvaluatedFinding {
  category: CategoryKey;
  checkKey: string;
  title: string;
  state: FindingState;
  scoreContribution: number;
  maxPoints: number;
  isInformational?: boolean;
  observedValue: Record<string, any>;
  evidenceSource: 'HTTP_PROBE' | 'HTML_PARSER' | 'DNS' | 'SYSTEM' | 'BROWSER_RENDER';
  evidenceLabel: EvidenceLabel;
  supportingDetail: string;
}

export interface CategoryScore {
  category: CategoryKey;
  label: string;
  weight: number; // e.g. 0.20
  score: number | null;  // 0 - 100 (performance on evaluable checks, or null if 0% evaluable)
  coveragePercent: number; // 0 - 100 (% of expected evidence evaluated)
  confidence: ConfidenceLevel;
  earnedPoints: number;
  evaluatedMaxPoints: number;
  maxPoints: number;
  evaluableCheckCount: number;
  totalCheckCount: number;
  unknownCheckCount: number;
}

export interface ScoreBreakdown {
  digitalPresence: number | null;
  customerJourney: number | null;
  trustReputation: number | null;
  localDiscovery: number | null;
  opportunityCapture: number | null;
  sourceType?: SourceType;
  platformKey?: HostedPlatformKey | null;
  platformLabel?: string | null;
  coverage?: {
    overall: number;
    confidence: ConfidenceLevel;
    digitalPresence: number;
    customerJourney: number;
    trustReputation: number;
    localDiscovery: number;
    opportunityCapture: number;
  };
  browserEvidence?: BrowserRenderedEvidence | null;
}

export interface ScanResult {
  scanStatus: ScanStatus;
  scanFailureReason?: string;
  sourceType?: SourceType;
  platformKey?: HostedPlatformKey | null;
  platformLabel?: string | null;
  overallScore: number | null;
  overallCoverage: number;
  confidence: ConfidenceLevel;
  scoreBreakdown: ScoreBreakdown | null;
  categoryScores: CategoryScore[];
  findings: EvaluatedFinding[];
  browserEvidence?: BrowserRenderedEvidence | null;
  normalizedUrl?: string;
  derivedBusinessName?: string | null;
  derivedCityState?: string | null;
  httpStatus?: number;
  responseTimeMs?: number;
  scannedAt: string;
}

export interface RawPageData {
  requestedUrl: string;
  finalUrl: string;
  normalizedUrl: string;
  isHttps: boolean;
  httpStatus: number;
  responseTimeMs: number;
  headers: Record<string, string>;
  html: string;
}
