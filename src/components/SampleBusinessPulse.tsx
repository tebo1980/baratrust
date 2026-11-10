'use client';

import Link from 'next/link';
import { trackPublicConversionEvent } from '@/lib/analytics';

export interface IllustrativePulsePillarItem {
  pillar: 'PROTECT' | 'IMPROVE' | 'GROW' | 'SAVE';
  statusBadge: string;
  headline: string;
  illustrativeEvidence: string;
  finding: string;
  recommendation: string;
  verification: string;
}

export const ILLUSTRATIVE_RETAIL_PULSE_ITEMS: IllustrativePulsePillarItem[] = [
  {
    pillar: 'PROTECT',
    statusBadge: 'Worth Fixing',
    headline: 'Sunday storefront hours conflict across public map listings',
    illustrativeEvidence:
      'Illustrative check across storefront website footer, Google Business listing, Apple Maps, and pinned Instagram holiday post.',
    finding:
      'Website and Instagram show Sunday hours (12pm–5pm), while Apple Maps and an older directory listing still display “Closed Sundays,” risking lost weekend walk-in traffic.',
    recommendation:
      'Update the two out-of-sync map listings so weekend shoppers see consistent hours before driving over.',
    verification:
      'Human cross-check of live map listings against current seasonal door hours confirmed with the shop owner.',
  },
  {
    pillar: 'IMPROVE',
    statusBadge: 'Practical Upgrade',
    headline: 'Gift-card and group-outfitting inquiries buried three taps deep on mobile',
    illustrativeEvidence:
      'Illustrative mobile walkthrough (390px viewport) from homepage hero to gift-card and local club bulk-order pages.',
    finding:
      'Shoppers looking for gift cards or scout/club gear orders must open the mobile menu, expand “About,” and scroll past store history before finding an inquiry form.',
    recommendation:
      'Add a direct “Gift Cards & Group Orders” link on the mobile home view leading to a short 3-field inquiry form.',
    verification:
      'Tested end-to-end on mobile Safari and Chrome; confirmed existing ecommerce platform supports the link without new software.',
  },
  {
    pillar: 'GROW',
    statusBadge: 'Timely Local Window',
    headline: 'Two Southern Indiana / Louisville outdoor community events open vendor applications next month',
    illustrativeEvidence:
      'Illustrative scan of regional parks calendars, trail-association announcements, and neighborhood festival vendor packets across Floyd, Clark, and Jefferson Counties.',
    finding:
      'Two local trail and riverfront community events matching the shop’s core customer base have vendor booth deadlines closing in 28 days, with modest booth fees.',
    recommendation:
      'Apply for the Saturday riverfront trail kickoff booth (strongest audience match); skip the second Sunday street fair where general food/music booths dominate.',
    verification:
      'Reviewed published organizer vendor packet, booth fee schedule, prior-year exhibitor list, and staffing overlap with Saturday store hours.',
  },
  {
    pillar: 'SAVE',
    statusBadge: 'No Change Recommended',
    headline: 'Packaging supplier comparison: keep current regional box & bag vendor',
    illustrativeEvidence:
      'Illustrative side-by-side quote check comparing current regional paper-bag supplier against two lower-unit-price national mail-order wholesalers.',
    finding:
      'Although one national wholesaler advertises a lower per-bag unit price, freight surcharges to Southern Indiana and a 5,000-unit minimum order erase the savings and tie up backroom shelf space.',
    recommendation:
      'No action recommended. Stay with the current supplier and revisit only if order volume doubles before holiday season.',
    verification:
      'Calculated landed cost including residential/liftgate freight, storage footprint, and reorder lead time.',
  },
];

export function SampleBusinessPulsePreview({
  theme = 'landing',
}: {
  theme?: 'landing' | 'dark';
}) {
  const isDark = theme === 'dark';

  if (isDark) {
    return (
      <section className="bg-[#0A101D] border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-mono font-bold uppercase tracking-wider">
              Illustrative Fictional Sample — Not an Actual Client
            </div>
            <h2 className="text-2xl font-bold text-white font-serif">
              What a Monthly Business Pulse Looks Like
            </h2>
            <p className="text-sm text-slate-400">
              Fictional composite: <strong>“Riverbend Trail &amp; Provisions”</strong> (illustrative specialty retail shop in the Southern Indiana / Louisville area). Shown purely to illustrate format, evidence, and restraint.
            </p>
          </div>
          <Link
            href="/sample-pulse"
            onClick={() => trackPublicConversionEvent('sample_pulse_viewed', 'pricing_page')}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-lg text-xs font-mono font-bold uppercase tracking-wider whitespace-nowrap transition-colors text-center"
          >
            View Full Sample Pulse &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ILLUSTRATIVE_RETAIL_PULSE_ITEMS.map((item) => (
            <div
              key={item.pillar}
              className="bg-[#0E1524] border border-slate-800/90 rounded-xl p-5 space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
                  {item.pillar}
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {item.statusBadge}
                </span>
              </div>
              <h3 className="text-base font-bold text-white font-serif">{item.headline}</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                <strong className="text-slate-200">Recommendation:</strong> {item.recommendation}
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                <strong className="text-slate-300">How we verify:</strong> {item.verification}
              </p>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-400 italic">
          Disclosure: Fictional composite for illustration only — does not represent a real business, verified customer audit, or achieved financial outcome.
        </p>
      </section>
    );
  }

  return (
    <div
      style={{
        marginTop: '36px',
        padding: '28px',
        borderRadius: '18px',
        border: '1px solid var(--line)',
        background: 'var(--surface)',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '16px',
          paddingBottom: '18px',
          borderBottom: '1px solid var(--line)',
          marginBottom: '20px',
        }}
      >
        <div style={{ maxWidth: '680px' }}>
          <p className="eyebrow" style={{ marginBottom: '6px' }}>
            Illustrative Sample Business Pulse (Fictional Specialty Retail Composite)
          </p>
          <h3 style={{ fontSize: '1.45rem', marginBottom: '8px' }}>
            See how evidence, findings, recommendations, and verification come together
          </h3>
          <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--muted)' }}>
            <strong>Illustrative example only:</strong> “Riverbend Trail &amp; Provisions” is a fictional Southern Indiana / Louisville specialty retailer created to show what a human-researched{' '}
            <strong>$99/month Monthly Business Pulse</strong> looks like (1 written report/month + urgent heads-ups; optional implementation quoted separately upfront) — not an actual client or claimed financial result.
          </p>
        </div>
        <Link
          href="/sample-pulse"
          className="btn secondary"
          onClick={() => trackPublicConversionEvent('sample_pulse_viewed', 'pulse_section')}
        >
          Inspect Full Sample Pulse &rarr;
        </Link>
      </div>

      <div className="service-grid">
        {ILLUSTRATIVE_RETAIL_PULSE_ITEMS.map((item) => (
          <article key={item.pillar} className="service-card" style={{ padding: '20px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '8px',
              }}
            >
              <span className="eyebrow" style={{ margin: 0 }}>
                {item.pillar}
              </span>
              <span
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '999px',
                  border: '1px solid var(--line)',
                  color: 'var(--muted)',
                }}
              >
                {item.statusBadge}
              </span>
            </div>
            <h4 style={{ fontSize: '1.02rem', margin: '0 0 8px' }}>{item.headline}</h4>
            <p style={{ fontSize: '0.86rem', marginBottom: '8px' }}>
              <strong>Evidence checked:</strong> {item.illustrativeEvidence}
            </p>
            <p style={{ fontSize: '0.86rem', marginBottom: '8px' }}>
              <strong>Recommendation:</strong> {item.recommendation}
            </p>
            <p style={{ fontSize: '0.82rem', margin: 0, color: 'var(--muted)' }}>
              <strong>Verification:</strong> {item.verification}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
