import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Client Service Agreement — BaraTrust',
  robots: 'noindex, nofollow',
}

export default function TermsPage() {
  return (
    <>
      {/* NAV */}
      <nav>
        <a href="/" className="nav-brand">
          <div className="nav-logo-mark">&#x1F9AB;</div>
          BaraTrust
        </a>
        <a href="/" className="nav-back">&#8592; Back to BaraTrust.com</a>
      </nav>

      {/* HERO */}
      <div className="terms-hero">
        <span className="terms-tag">Legal · Client Agreement</span>
        <h1>BaraTrust Client<br /><em>Service Agreement</em></h1>
        <p>This agreement governs the relationship between BaraTrust and its clients. We believe in plain English, no surprises, and no fine print designed to confuse you. Read this before you sign — we want you to understand exactly what you&apos;re getting and what we&apos;re committing to.</p>
        <div className="terms-meta">
          <div className="terms-meta-item"><strong>Effective Date</strong>January 1, 2026</div>
          <div className="terms-meta-item"><strong>Governing Law</strong>State of Indiana</div>
          <div className="terms-meta-item"><strong>Contact</strong>todd@baratrust.com</div>
          <div className="terms-meta-item"><strong>Phone</strong>502-431-3285</div>
        </div>
      </div>

      {/* TOC */}
      <div className="terms-toc">
        <div className="toc-label">Table of Contents</div>
        <ul className="toc-grid">
          <li><a href="#services">1. Services Provided</a></li>
          <li><a href="#terms">2. Subscription Terms</a></li>
          <li><a href="#pricing">3. Pricing and Payment</a></li>
          <li><a href="#etf">4. Early Termination Fee</a></li>
          <li><a href="#ownership">5. What You Own vs What We Own</a></li>
          <li><a href="#website">6. Website Ownership</a></li>
          <li><a href="#payment-failure">7. What Happens If Payment Fails</a></li>
          <li><a href="#guarantee">8. The 90 Day Prove It Guarantee</a></li>
          <li><a href="#loyalty">9. Loyalty Renewal Options</a></li>
          <li><a href="#transfer">10. Transfer of Ownership</a></li>
          <li><a href="#price-lock">11. Price Lock Guarantee</a></li>
          <li><a href="#disputes">12. Dispute Resolution</a></li>
          <li><a href="#governing">13. Governing Law</a></li>
        </ul>
      </div>

      {/* CONTENT */}
      <div className="terms-content">
        <TermsSection id="services" num="01" title="Services Provided">
          <p>BaraTrust agrees to provide the services outlined in the selected subscription tier — Starter, AI Staff Only, or Complete — as described at the time of enrollment and as detailed on the BaraTrust website at baratrust.com.</p>
          <p>Services are delivered on a monthly basis beginning within <strong>seven business days</strong> of signed agreement and payment receipt. This seven day launch commitment is BaraTrust&apos;s promise to every client and is not subject to negotiation or extension except in cases where the client fails to provide required business information within the first 48 hours of signing.</p>
          <p>BaraTrust reserves the right to update or expand service offerings over time. Existing clients will not have services removed without written notice of at least 30 days.</p>
        </TermsSection>

        <TermsSection id="terms" num="02" title="Subscription Terms">
          <p>All new BaraTrust clients begin on a <strong>twelve month initial agreement</strong>. This is the only starting option for new clients.</p>
          <table className="tier-table">
            <thead><tr><th>Agreement Type</th><th>Duration</th><th>Discount</th><th>Available To</th></tr></thead>
            <tbody>
              <tr><td>Standard Twelve Month</td><td>12 months</td><td>None — full price</td><td>All new clients</td></tr>
              <tr><td>Twenty Four Month</td><td>24 months</td><td>10% off monthly rate</td><td>All new clients</td></tr>
              <tr><td>Month to Month</td><td>Ongoing</td><td>None — no price lock</td><td>Loyalty clients only*</td></tr>
              <tr><td>Six Month Loyalty</td><td>6 months renewable</td><td>10% loyalty discount</td><td>Loyalty clients only*</td></tr>
              <tr><td>Twenty Four Month Loyalty</td><td>24 months</td><td>15% loyalty discount</td><td>Loyalty clients only*</td></tr>
            </tbody>
          </table>
          <p>*Loyalty options are available exclusively to clients who have completed at least one full twelve month initial term in good standing.</p>
          <div className="highlight-box"><p>No six month agreements are offered to new clients under any circumstances. The twelve month minimum exists to protect both parties.</p></div>
          <p>Agreements renew automatically at the end of each term at the then-current standard rate unless the client provides written notice of cancellation at least <strong>30 days before</strong> the renewal date.</p>
        </TermsSection>

        <TermsSection id="pricing" num="03" title="Pricing and Payment">
          <p>Current one-time production rates are as follows:</p>
          <ul>
            <li><strong>Sizzle Reel</strong> — $199</li>
            <li><strong>Social Starter Pack</strong> — $399</li>
            <li><strong>Full Commercial</strong> — $599</li>
            <li><strong>Radio Spot</strong> — $149 (30-second); $198 (60-second)</li>
            <li><strong>Commercial + Radio Bundle</strong> — $699</li>
          </ul>
          <p>Current recurring monthly rates are as follows:</p>
          <ul>
            <li><strong>Content Subscription</strong> — $299 per month</li>
            <li><strong>Social Management Add-On</strong> — $149 per month</li>
            <li><strong>Agency Tier (White Label)</strong> — $499 per month</li>
          </ul>
          <p>Payment is due on the same date each month for recurring services. One-time productions are billed in full at time of order. BaraTrust uses Stripe for all payment processing.</p>
        </TermsSection>

        <TermsSection id="etf" num="04" title="Early Termination Fee">
          <p>Clients who terminate their agreement before the end of their contracted term are subject to an Early Termination Fee equal to <strong>fifty percent of the remaining monthly payments</strong> on their contract.</p>
          <div className="example-box"><strong>Example Calculation</strong>A client on a twelve month Agency Tier agreement at $499 per month who cancels after month four has eight months remaining. Their Early Termination Fee is 50% of 8 payments: 8 × $499 × 50% = <strong>$1,996</strong>.</div>
          <p>The Early Termination Fee is due within 30 days of the cancellation date.</p>
          <div className="highlight-box"><p>Clients who receive a free month under the 90 Day Prove It Guarantee are not eligible for early termination without payment of the full ETF.</p></div>
          <p>ETF is waived in the event of the client&apos;s verified permanent business closure.</p>
        </TermsSection>

        <TermsSection id="ownership" num="05" title="What You Own vs What We Own">
          <p>We believe in complete transparency about ownership.</p>
          <p><strong>You own — always, from day one:</strong></p>
          <ul>
            <li>Your domain name and all domain registrations</li>
            <li>All website content including written copy, photos, logos, and brand assets you provided</li>
            <li>Your Google Business Profile and all associated reviews</li>
            <li>All business directory listings created during the engagement</li>
            <li>Your business name, brand identity, and all trademarks</li>
            <li>All customer data, contact lists, and business records</li>
            <li>Any ad accounts created using your business name and payment method</li>
          </ul>
          <p><strong>BaraTrust owns:</strong></p>
          <ul>
            <li>All ad account structures, campaign architecture, and keyword strategies built by BaraTrust</li>
            <li>BaraTrust dashboard configurations and reporting templates</li>
            <li>The Revenue Loop system methodology and Business Health Score framework</li>
            <li>The Money Map dashboard configuration and design</li>
            <li>All proprietary BaraTrust systems, tools, and processes</li>
            <li>The CallRail tracking number if assigned by BaraTrust</li>
          </ul>
          <div className="sage-box"><p>BaraTrust will never hold your website, your Google Business Profile, or your customer data hostage. These belong to you and will be returned to you promptly upon request at any time.</p></div>
        </TermsSection>

        <TermsSection id="website" num="06" title="Website Ownership">
          <p>The website built by BaraTrust during the engagement is the <strong>property of the client</strong> upon termination, provided all outstanding balances are paid in full.</p>
          <p>BaraTrust will deliver all website files to the client within <strong>fourteen business days</strong> of final payment receipt.</p>
        </TermsSection>

        <TermsSection id="payment-failure" num="07" title="What Happens If Payment Fails">
          <p>BaraTrust understands that payment issues can arise. Here is exactly what happens and when:</p>
          <ul>
            <li><strong>Day 1 after failed payment</strong> — BaraTrust notifies the client by both email and text message.</li>
            <li><strong>Day 7</strong> — All active services are suspended until the account is brought current.</li>
            <li><strong>Day 14</strong> — BaraTrust sends a final written notice by email.</li>
            <li><strong>Day 30</strong> — The agreement is considered terminated. Early Termination Fees apply.</li>
          </ul>
          <div className="sage-box"><p>Suspended services are restored within 24 hours of payment receipt. No additional fees are charged for reinstatement during the first 30 days.</p></div>
        </TermsSection>

        <TermsSection id="guarantee" num="08" title="The 90 Day Prove It Guarantee">
          <p>BaraTrust guarantees a minimum of <strong>ten tracked inbound calls</strong> within the first ninety days of active service.</p>
          <div className="highlight-box"><p>A tracked call is defined as a unique inbound call lasting thirty seconds or longer, originating from a person searching for the client&apos;s type of business.</p></div>
          <p>If ten qualifying tracked calls are not delivered within ninety days <strong>the client&apos;s fourth month of service is provided at no charge</strong>.</p>
        </TermsSection>

        <TermsSection id="loyalty" num="09" title="Loyalty Renewal Options">
          <p>Upon successful completion of the initial twelve month term clients in good standing are offered loyalty renewal options.</p>
          <table className="tier-table">
            <thead><tr><th>Option</th><th>Discount</th><th>Price Lock</th><th>Cancellation</th></tr></thead>
            <tbody>
              <tr><td>Month to Month</td><td>None</td><td>No</td><td>30 days written notice</td></tr>
              <tr><td>Six Month Loyalty</td><td>10% off</td><td>Yes — 6 months</td><td>ETF if cancelled early</td></tr>
              <tr><td>Twenty Four Month Loyalty</td><td>15% off</td><td>Yes — 24 months</td><td>ETF if cancelled early</td></tr>
            </tbody>
          </table>
        </TermsSection>

        <TermsSection id="transfer" num="10" title="Transfer of Ownership">
          <p>If a client sells their business the new owner may assume the existing BaraTrust agreement subject to written notice within <strong>30 days</strong> of the sale.</p>
        </TermsSection>

        <TermsSection id="price-lock" num="11" title="Price Lock Guarantee">
          <div className="sage-box"><p>Your monthly rate will not increase during your active contract term regardless of any changes to BaraTrust&apos;s standard pricing.</p></div>
        </TermsSection>

        <TermsSection id="disputes" num="12" title="Dispute Resolution">
          <p>BaraTrust believes that most disagreements can be resolved through honest conversation.</p>
          <ul>
            <li><strong>Step one — Direct conversation.</strong> Contact BaraTrust at 502-431-3285 or todd@baratrust.com.</li>
            <li><strong>Step two — Written resolution attempt.</strong></li>
            <li><strong>Step three — Binding arbitration</strong> in the state of Indiana.</li>
          </ul>
        </TermsSection>

        <TermsSection id="governing" num="13" title="Governing Law">
          <p>This agreement is governed by the laws of the <strong>State of Indiana</strong>.</p>
          <div className="highlight-box"><p>Questions about this agreement? Call or text 502-431-3285 or email todd@baratrust.com.</p></div>
        </TermsSection>
      </div>

      {/* FOOTER */}
      <div className="terms-footer">
        <div className="footer-logo">&#x1F9AB; BaraTrust</div>
        <p>© 2026 BaraTrust · New Albany, Indiana</p>
        <p>Questions? <a href="tel:5024313285">502-431-3285</a> &nbsp;·&nbsp; todd@baratrust.com</p>
        <p style={{ marginTop: '20px' }}><a href="/">&#8592; Back to BaraTrust.com</a></p>
      </div>
    </>
  )
}

function TermsSection({ id, num, title, children }: { id: string; num: string; title: string; children: React.ReactNode }) {
  return (
    <div className="terms-section" id={id}>
      <div className="section-num">{num}</div>
      <div className="section-heading">{title}</div>
      {children}
    </div>
  )
}
