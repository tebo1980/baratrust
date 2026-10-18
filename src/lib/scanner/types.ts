export type FindingState = 'PASS' | 'FAIL' | 'UNKNOWN';
export type EvidenceLabel = 'AUTO_DETECTED' | 'OWNER_PROVIDED' | 'BARATRUST_REVIEW' | 'OPPORTUNITY_FOUND';
export type ScanStatus = 'pending' | 'completed' | 'failed' | 'blocked' | 'timeout';

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

export interface EvaluatedFinding {
  category: CategoryKey;
  checkKey: string;
  title: string;
  state: FindingState;
  scoreContribution: number;
  maxPoints: number;
  isInformational?: boolean;
  observedValue: Record<string, any>;
  evidenceSource: 'HTTP_PROBE' | 'HTML_PARSER' | 'DNS' | 'SYSTEM';
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
  coverage?: {
    overall: number;
    confidence: ConfidenceLevel;
    digitalPresence: number;
    customerJourney: number;
    trustReputation: number;
    localDiscovery: number;
    opportunityCapture: number;
  };
}

export interface ScanResult {
  scanStatus: ScanStatus;
  scanFailureReason?: string;
  overallScore: number | null;
  overallCoverage: number;
  confidence: ConfidenceLevel;
  scoreBreakdown: ScoreBreakdown | null;
  categoryScores: CategoryScore[];
  findings: EvaluatedFinding[];
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
