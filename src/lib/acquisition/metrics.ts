export interface MetricProspectRecord {
  id: string;
  businessName: string;
  websiteUrl?: string | null;
  contactValue?: string | null;
  realityCheckId?: string | null;
  draftStatus: string;
  approvedAt?: Date | string | null;
  optOut?: boolean | null;
  stage: string;
  conversationStartedAt?: Date | string | null;
  meetingBookedAt?: Date | string | null;
  meetingAttendedAt?: Date | string | null;
  convertedToPulseAt?: Date | string | null;
}

export interface MetricRealityCheckRecord {
  id: string;
  businessName?: string | null;
  website: string;
  email?: string | null;
  status: string;
}

export interface MetricBusinessMemberRecord {
  id: number | string;
  businessName: string;
  ownerEmail?: string | null;
  tier?: string | null;
  isActive?: boolean | null;
  stripeSubscriptionId?: string | null;
}

export interface MetricConversionEventRecord {
  eventName: string;
  surface: string;
}

export interface AcquisitionMeasurementSummary {
  prospectsResearched: number;
  prospectsApprovedForOutreach: number;
  conversationsStarted: number;
  meetingsBooked: number;
  meetingsAttended: number;
  unconfirmedBookingClicks: number;
  realityChecksTotalScans: number;
  realityChecksFollowUpRequests: number;
  businessPulseCustomersAcquired: number;
}

function normalizeEmailKey(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed.includes('@')) return null;
  return `email:${trimmed}`;
}

function normalizeDomainKey(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;
  try {
    const candidate = /^[a-z]+:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(candidate);
    const host = parsed.hostname.replace(/^www\./, '');
    if (
      !host ||
      host.includes('facebook.com') ||
      host.includes('google.com') ||
      host.includes('instagram.com') ||
      host.includes('yelp.com')
    ) {
      // Hosted platforms share domains across unrelated businesses; include pathname
      const cleanPath = parsed.pathname.replace(/\/+$/, '');
      return cleanPath ? `url:${host}${cleanPath}` : null;
    }
    return `domain:${host}`;
  } catch {
    return null;
  }
}

function normalizeNameKey(raw?: string | null): string | null {
  if (!raw) return null;
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return cleaned.length >= 3 ? `name:${cleaned}` : null;
}

const CONVERSATION_OR_BEYOND_STAGES = new Set([
  'CONVERSATION_STARTED',
  'MEETING_BOOKED',
  'MEETING_ATTENDED',
  'CUSTOMER_ACQUIRED',
]);

/**
 * Computes Part C Measurement counts while enforcing:
 * 1. Booking link clicks (`unconfirmedBookingClicks`) are NEVER counted as `meetingsBooked`.
 * 2. Conversations started and Business Pulse customers acquired are deduplicated across
 *    `acquisition_prospects`, `reality_checks` follow-up requests, and active Stripe `businesses`
 *    so a prospect present in two tables is never double-counted.
 */
export function computeAcquisitionMeasurements(params: {
  prospects: MetricProspectRecord[];
  realityChecks: MetricRealityCheckRecord[];
  businesses: MetricBusinessMemberRecord[];
  conversionEvents: MetricConversionEventRecord[];
}): AcquisitionMeasurementSummary {
  const { prospects, realityChecks, businesses, conversionEvents } = params;

  const prospectsResearched = prospects.length;

  const prospectsApprovedForOutreach = prospects.filter(
    (p) =>
      !p.optOut &&
      (Boolean(p.approvedAt) ||
        p.draftStatus === 'APPROVED_FOR_OUTREACH' ||
        p.stage === 'APPROVED_FOR_OUTREACH' ||
        p.stage === 'OUTREACH_SENT')
  ).length;

  // Reality Check counts (deduplicate follow-up requests by normalized email or scan ID)
  const realityChecksTotalScans = realityChecks.length;
  const followUpIdentitySet = new Set<string>();
  const rcIdWithFollowUp = new Set<string>();

  for (const rc of realityChecks) {
    const hasFollowUp =
      Boolean(rc.email && rc.email.trim()) ||
      rc.status === 'NEEDS_HUMAN_REVIEW' ||
      rc.status === 'IN_REVIEW' ||
      rc.status === 'READY_TO_PUBLISH' ||
      rc.status === 'PUBLISHED';

    if (hasFollowUp) {
      rcIdWithFollowUp.add(rc.id);
      const key =
        normalizeEmailKey(rc.email) ||
        normalizeDomainKey(rc.website) ||
        `rc:${rc.id}`;
      followUpIdentitySet.add(key);
    }
  }
  const realityChecksFollowUpRequests = followUpIdentitySet.size;

  // Conversations started: deduplicate across prospects + inbound Reality Check follow-up requests
  const conversationKeys = new Set<string>();
  const linkedRcIds = new Set<string>();

  for (const p of prospects) {
    const hasConversation =
      Boolean(p.conversationStartedAt) ||
      Boolean(p.meetingBookedAt) ||
      Boolean(p.meetingAttendedAt) ||
      Boolean(p.convertedToPulseAt) ||
      CONVERSATION_OR_BEYOND_STAGES.has(p.stage);

    if (p.realityCheckId) {
      linkedRcIds.add(p.realityCheckId);
    }

    if (hasConversation) {
      const key =
        normalizeEmailKey(p.contactValue) ||
        normalizeDomainKey(p.websiteUrl) ||
        normalizeNameKey(p.businessName) ||
        `prospect:${p.id}`;
      conversationKeys.add(key);
    }
  }

  for (const rc of realityChecks) {
    if (!rcIdWithFollowUp.has(rc.id)) continue;
    // Skip if already linked via realityCheckId on a counted prospect
    if (linkedRcIds.has(rc.id)) {
      const matchingProspect = prospects.find((p) => p.realityCheckId === rc.id);
      if (
        matchingProspect &&
        (Boolean(matchingProspect.conversationStartedAt) ||
          CONVERSATION_OR_BEYOND_STAGES.has(matchingProspect.stage))
      ) {
        continue;
      }
    }
    const emailKey = normalizeEmailKey(rc.email);
    const domainKey = normalizeDomainKey(rc.website);
    if ((emailKey && conversationKeys.has(emailKey)) || (domainKey && conversationKeys.has(domainKey))) {
      continue;
    }
    conversationKeys.add(emailKey || domainKey || `rc:${rc.id}`);
  }

  // Confirmed meetings ONLY (strictly separate from booking clicks)
  const meetingsBooked = prospects.filter(
    (p) =>
      Boolean(p.meetingBookedAt) ||
      Boolean(p.meetingAttendedAt) ||
      p.stage === 'MEETING_BOOKED' ||
      p.stage === 'MEETING_ATTENDED'
  ).length;

  const meetingsAttended = prospects.filter(
    (p) => Boolean(p.meetingAttendedAt) || p.stage === 'MEETING_ATTENDED'
  ).length;

  const unconfirmedBookingClicks = conversionEvents.filter(
    (ev) => ev.eventName === 'booking_link_clicked'
  ).length;

  // Business Pulse customers acquired: deduplicate across prospects & active Stripe members
  const customerIdentityKeys = new Set<string>();
  const customerEmailSet = new Set<string>();
  const customerNameSet = new Set<string>();

  for (const p of prospects) {
    if (p.stage === 'CUSTOMER_ACQUIRED' || Boolean(p.convertedToPulseAt)) {
      const em = normalizeEmailKey(p.contactValue);
      const nm = normalizeNameKey(p.businessName);
      const dm = normalizeDomainKey(p.websiteUrl);
      if (em) customerEmailSet.add(em);
      if (nm) customerNameSet.add(nm);
      customerIdentityKeys.add(em || dm || nm || `prospect:${p.id}`);
    }
  }

  for (const b of businesses) {
    const isActivePaid =
      b.isActive === true &&
      (b.tier === 'Active Member' ||
        b.tier === 'Business Pulse' ||
        Boolean(b.stripeSubscriptionId && b.stripeSubscriptionId.trim()));
    if (!isActivePaid) continue;

    const em = normalizeEmailKey(b.ownerEmail);
    const nm = normalizeNameKey(b.businessName);
    if ((em && customerEmailSet.has(em)) || (nm && customerNameSet.has(nm))) {
      continue;
    }
    if (em) customerEmailSet.add(em);
    if (nm) customerNameSet.add(nm);
    customerIdentityKeys.add(em || nm || `biz:${b.id}`);
  }

  return {
    prospectsResearched,
    prospectsApprovedForOutreach,
    conversationsStarted: conversationKeys.size,
    meetingsBooked,
    meetingsAttended,
    unconfirmedBookingClicks,
    realityChecksTotalScans,
    realityChecksFollowUpRequests,
    businessPulseCustomersAcquired: customerIdentityKeys.size,
  };
}
