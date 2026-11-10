"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import RealityCheckFunnel from "@/components/RealityCheckFunnel";
import { BookingLink, PulseCheckoutLink } from "@/components/ContactLinks";
import { SampleBusinessPulsePreview } from "@/components/SampleBusinessPulse";
import { trackPublicConversionEvent } from "@/lib/analytics";
import "./landing.css";

export default function LandingPage() {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
    let savedTheme;
    try {
      savedTheme = localStorage.getItem("baratrust-theme");
    } catch (_) {}
    if (savedTheme === "dark" || savedTheme === "light") {
      setTheme(savedTheme);
    } else {
      setTheme(systemTheme.matches ? "dark" : "light");
    }

    const listener = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem("baratrust-theme")) {
        setTheme(e.matches ? "dark" : "light");
      }
    };
    systemTheme.addEventListener("change", listener);
    return () => systemTheme.removeEventListener("change", listener);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    try {
      localStorage.setItem("baratrust-theme", newTheme);
    } catch (_) {}
  };

  return (
    <div className="landing-wrapper" data-theme={theme}>
      <header className="site-header">
        <div className="wrap nav-wrap">
          <a className="brand" href="#top">
            <span className="brand-mark">B</span>
            <span>BaraTrust</span>
          </a>
          <nav>
            <a href="#services">What we watch</a>
            <a href="#pulse">Business Pulse · $99/mo</a>
            <Link
              href="/sample-pulse"
              onClick={() => trackPublicConversionEvent("sample_pulse_viewed", "nav")}
            >
              Sample Pulse
            </Link>
            <a href="#how">How it works</a>
            <a className="nav-cta" href="#start">
              Free Reality Check
            </a>
            <button
              id="theme-toggle"
              className="theme-toggle"
              type="button"
              aria-pressed={theme === "dark"}
              onClick={toggleTheme}
            >
              {theme === "dark" ? "Day mode" : "Night mode"}
            </button>
          </nav>
        </div>
      </header>

      <main id="top">
        {/* 1. HERO + FIELD WATCH CARD */}
        <section className="hero">
          <div className="wrap hero-grid">
            <div>
              <p className="eyebrow">PROTECT • IMPROVE • GROW • SAVE</p>
              <h1>BaraTrust watches your business so you don’t have to.</h1>
              <p className="hero-copy">
                You run your business. BaraTrust keeps looking around the corner.
              </p>
              <p className="section-intro" style={{ marginTop: "14px" }}>
                We continuously look for ways to protect your business, improve what’s already working, uncover new growth opportunities, and identify places you may be spending more than necessary. Then we tell you what actually deserves your attention — and help you act when it makes sense.
              </p>
              <div className="cta-row">
                <a className="btn primary" href="#start">
                  Run Free Reality Check
                </a>
                <a className="btn secondary" href="#pulse">
                  Business Pulse — $99/month
                </a>
                <BookingLink surface="hero" className="btn secondary">
                  Book a Free 15-Minute Conversation
                </BookingLink>
              </div>
              <p className="micro">
                <strong>Free Reality Check ($0):</strong> instant automated public scan (no email required).{" "}
                <strong>Business Pulse ($99/month):</strong> one written human-researched report each month + timely heads-ups.
              </p>
            </div>

            <aside className="reality-card">
              <p className="card-kicker">
                Even well-run businesses miss things when the owner is busy running day-to-day operations:
              </p>
              <ul>
                <li>A worthwhile local event, booth, or partnership deadline passes by unnoticed</li>
                <li>A nearby competitor changes offers, positioning, or customer appeal</li>
                <li>Public business details, links, or mobile pages drift out of date</li>
                <li>Warm inquiries, catering requests, or past quotes don’t get followed up</li>
                <li>Suppliers, software, or monthly services quietly creep up in cost</li>
                <li>Reviews or customer-experience friction start building before anyone flags them</li>
              </ul>
              <p className="card-bottom">
                You don’t need something broken to benefit from someone watching the field for you.
              </p>
            </aside>
          </div>
        </section>

        {/* 2. TRUST & RESTRAINT STRIP */}
        <section className="proof-strip">
          <div className="wrap proof-grid">
            <div>
              <strong>Built for real small businesses</strong>
              <span>
                Plain English, transparent $99/month pricing, and practical business sense — no consultant jargon, no agency smoke, and no dashboards to learn.
              </span>
            </div>
            <div>
              <strong>Restraint is part of the product</strong>
              <span>
                We never manufacture problems just to sell a project. When something is working fine or a switch isn’t worth the risk, we say so.
              </span>
            </div>
            <div>
              <strong>Rooted in Southern Indiana &amp; Louisville</strong>
              <span>
                Based locally and working with independent owners across New Albany, Jeffersonville, Clarksville, Greater Louisville, and beyond.
              </span>
            </div>
          </div>
        </section>

        {/* 3. FOUR PILLARS + EXECUTION CAPABILITIES */}
        <section id="services" className="section">
          <div className="wrap">
            <p className="eyebrow">PROTECT • IMPROVE • GROW • SAVE</p>
            <h2>Four ways we look out for your business.</h2>
            <p className="section-intro">
              We look inside and outside your business for things worth knowing, problems worth addressing, opportunities worth pursuing, and costs worth questioning.
            </p>

            <div className="service-grid">
              <article className="service-card">
                <span className="number">01</span>
                <h3>Protect</h3>
                <p>Spot risks and issues that could hurt your business before they turn into expensive surprises.</p>
                <ul>
                  <li>Customer-experience problems and broken inquiry paths</li>
                  <li>Reputation changes and customer review patterns</li>
                  <li>Incorrect or inconsistent public business information</li>
                  <li>Competitive threats and local market shifts worth watching</li>
                  <li>Website trust and digital-safety concerns (coordinating qualified specialists when dedicated security work is needed)</li>
                  <li>Vendor, platform, or technology risks</li>
                </ul>
              </article>

              <article className="service-card">
                <span className="number">02</span>
                <h3>Improve</h3>
                <p>Find practical ways to make what is already working perform even better.</p>
                <ul>
                  <li>Customer journey, checkout, booking, and conversion clarity</li>
                  <li>Stronger retention and follow-up on calls, quotes, and repeat customers</li>
                  <li>Online visibility, websites, menus, and merchandising presentation</li>
                  <li>Day-to-day operational and process improvements</li>
                  <li>Practical checklists, SOPs, training guides, and workflow automation</li>
                </ul>
              </article>

              <article className="service-card">
                <span className="number">03</span>
                <h3>Grow</h3>
                <p>
                  Actively search outside and inside your business for revenue opportunities you may never have known existed.
                </p>
                <ul>
                  <li>Local events, festivals, and vendor or booth opportunities</li>
                  <li>Partnerships and corporate, catering, wholesale, or B2B opportunities</li>
                  <li>New customer groups, geographic opportunities, and local developments</li>
                  <li>Competitor gaps, emerging demand, and new sales channels</li>
                  <li>Products or services worth evaluating and cross-selling angles</li>
                  <li>Worthwhile advertising and promotional opportunities</li>
                </ul>
              </article>

              <article className="service-card">
                <span className="number">04</span>
                <h3>Save</h3>
                <p>
                  Look for legitimate ways to reduce expenses or get more value from existing spending — weighing total value, not just the lowest price.
                </p>
                <ul>
                  <li>Alternative suppliers, manufacturers, or purchasing opportunities</li>
                  <li>Side-by-side vendor and service-provider comparisons</li>
                  <li>Software overlap, better-value alternatives, and unnecessary expenses</li>
                  <li>Operational efficiencies that protect quality and staff workflow</li>
                  <li>Careful review of quality, reliability, contracts, shipping, minimum orders, and switching costs</li>
                  <li>Honest calls when the right answer is: “No change recommended — your current provider remains competitive”</li>
                </ul>
              </article>
            </div>

            <div className="starter-note" style={{ marginTop: "32px" }}>
              <strong>Intelligence comes first. Execution is ready when it makes sense.</strong>
              <span>
                When BaraTrust identifies something worth acting on, we can{" "}
                <strong>(1) handle the work directly</strong> — including websites and online stores, commercials and short-form video, social campaigns and graphics, virtual product photography, audio ads and jingles, event or booth applications and promo materials, supplier research and quote comparisons, SOPs and training materials, outreach lists, and workflow setup;{" "}
                <strong>(2) coordinate or recommend a qualified specialist</strong> when a job calls for dedicated outside expertise; or{" "}
                <strong>(3) tell you that no action is warranted</strong>. Partner or referral compensation never determines our recommendations and is always disclosed when relevant.
              </span>
            </div>
          </div>
        </section>

        {/* 4. BUSINESS PULSE — $99/MONTH + SAMPLE PULSE */}
        <section id="pulse" className="section alt">
          <div className="wrap">
            <div className="who-grid">
              <div>
                <p className="eyebrow">Business Pulse — $99/month</p>
                <h2>Tangible monthly intelligence. Zero filler.</h2>
                <p className="section-intro">
                  <strong>Business Pulse ($99/month)</strong> is BaraTrust’s human-researched monthly watch service. Each month, Todd and Noelah look across your business and surrounding local market for practical ways to{" "}
                  <strong>Protect, Improve, Grow, and Save</strong> — and hand you a clear written brief on what actually deserves attention.
                </p>
                <p>
                  <strong>What you receive &amp; how often you hear from us:</strong> You receive{" "}
                  <strong>one written Monthly Business Pulse report</strong> each month (a clean, plain-English PDF / brief with clickable source links, focused Decision Cards, and notes on what only you can verify internally) —{" "}
                  <strong>plus a quick personal heads-up in between</strong> only if something time-sensitive comes up, like an upcoming event booth deadline or broken public hours. Never weekly filler spam, and no software dashboard to learn.
                </p>
                <p>
                  <strong>What’s included in $99/month vs. what costs extra:</strong> Your $99/month covers ongoing watch, manual human research, verification, and plain-English recommendations — and you can act on any recommendation yourself for{" "}
                  <strong>$0 extra</strong>. Hands-on implementation (such as building or fixing websites, updating multi-platform listings or menus, producing video/ads, preparing booth applications, supplier quote legwork, SOPs, or workflow setup) costs extra and is always{" "}
                  <strong>quoted upfront as a flat, pre-approved project fee</strong> before any work starts.
                </p>
                <div className="cta-row" style={{ marginTop: "24px" }}>
                  <PulseCheckoutLink surface="pulse_section" className="btn primary">
                    Start Business Pulse — $99/month
                  </PulseCheckoutLink>
                  <BookingLink surface="pulse_section" className="btn secondary">
                    Book a Free 15-Minute Conversation
                  </BookingLink>
                  <Link href="/pricing" className="btn secondary">
                    Full Pricing &amp; Details
                  </Link>
                </div>
                <p className="micro">
                  $99/month · Cancel anytime · No surprise hourly bills or unapproved project charges.
                </p>
              </div>

              <aside className="reality-card" style={{ marginTop: 0 }}>
                <p className="card-kicker">
                  Free Automated Reality Check vs. Personalized Human Report:
                </p>
                <ul>
                  <li>
                    <strong>Free Reality Check ($0 · Automated Scan):</strong> An instant software check of one public link (HTTPS, mobile setup, metadata, tap-to-call, contact paths, schema). No human has reviewed your menus, third-party listings, competitors, or vendor costs yet.
                  </li>
                  <li>
                    <strong>Business Pulse ($99/mo · Human-Researched):</strong> Custom outside-in &amp; local market research by Todd and Noelah — checking cross-platform hours and menus, nearby competitors, local events &amp; partnerships, and supplier value.
                  </li>
                  <li>
                    <strong>Cadence you can count on:</strong> 1 written Monthly Business Pulse report + quick heads-ups in between only when something is genuinely time-sensitive.
                  </li>
                  <li>
                    <strong>Restraint &amp; clear boundaries:</strong> “No action recommended” is a normal, honest outcome — and optional hands-on execution is always flat-quoted upfront.
                  </li>
                </ul>
                <p className="card-bottom">
                  Note: While we occasionally prepare a complimentary one-time personalized sample report selectively by invitation when reviewing a business, the self-serve online Reality Check is strictly an automated scan.
                </p>
              </aside>
            </div>

            <SampleBusinessPulsePreview theme="landing" />
          </div>
        </section>

        {/* 5. HOW THE PRODUCT LADDER WORKS */}
        <section id="how" className="section">
          <div className="wrap">
            <p className="eyebrow">How it works</p>
            <h2>Automated scan first. Human-researched Pulse monthly. Execution only when wanted.</h2>
            <div className="steps">
              <div className="step">
                <span>1</span>
                <h3>Free Automated Scan</h3>
                <p>
                  <strong>Instant software snapshot ($0).</strong> Paste one public link to check surface website or profile signals in seconds — no email required, and clearly distinct from a custom human-researched report.
                </p>
              </div>
              <div className="step">
                <span>2</span>
                <h3>Business Pulse — $99/mo</h3>
                <p>
                  <strong>1 written report/month + timely alerts.</strong> Human research by Todd &amp; Noelah delivered as a monthly PDF/brief with source-linked Decision Cards, plus a quick heads-up in between only if something urgent surfaces.
                </p>
              </div>
              <div className="step">
                <span>3</span>
                <h3>Optional Implementation</h3>
                <p>
                  <strong>Quoted extra as a flat fee.</strong> Handle any recommendation in-house for $0 extra, or ask us for an upfront, pre-approved flat project quote before we build, fix, or coordinate anything for you.
                </p>
              </div>
              <div className="step">
                <span>4</span>
                <h3>Broader Managed Support</h3>
                <p>
                  <strong>Go deeper when appropriate.</strong> Businesses wanting ongoing hands-on execution across marketing, creative, or operations can scope broader support when it makes sense.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. WHO IT'S FOR */}
        <section id="who" className="section alt">
          <div className="wrap who-grid">
            <div>
              <p className="eyebrow">Who it’s for</p>
              <h2>For owners busy running a real business — whether things feel hectic or healthy.</h2>
              <p className="section-intro">
                Restaurants, boutiques and specialty retailers, contractors, trades, local service businesses, makers, and independent teams across Southern Indiana (New Albany, Jeffersonville, Clarksville, Floyd &amp; Clark Counties) and Greater Louisville — as well as independent owners anywhere who want someone credible watching for new revenue opportunities, market changes, and smarter spending.
              </p>
            </div>
            <div className="quote-box">
              <p>
                “I’m busy running the business every day. I just don’t have time to watch every competitor, hunt down opportunities I don’t even know exist, or check whether we’re overpaying vendors.”
              </p>
              <span>That’s who we built BaraTrust for.</span>
            </div>
          </div>
        </section>

        {/* 7. HUMAN JUDGMENT FIRST */}
        <section className="section dark">
          <div className="wrap">
            <p className="eyebrow">Human-led judgment</p>
            <h2>Real monitoring and judgment — not another tool on your to-do list.</h2>
            <p className="section-intro light-copy">
              Small-business owners don’t need software homework, enterprise buzzwords, or generic checklists. Behind the scenes, technology helps us scan and research faster — while Todd and Noelah apply real human judgment, weigh switching costs and operational risk, and stand behind what actually deserves your attention.
            </p>
            <p className="light-copy">
              <strong>You run your business. BaraTrust keeps watch.</strong> And when the smartest move is to leave things alone, that’s exactly what we’ll tell you.
            </p>
            <div className="cta-row" style={{ marginTop: "22px" }}>
              <BookingLink surface="intake_section" className="btn primary">
                Book a Free 15-Minute Conversation
              </BookingLink>
              <Link
                href="/sample-pulse"
                className="btn secondary"
                onClick={() => trackPublicConversionEvent("sample_pulse_viewed", "intake_section")}
              >
                Read Sample Business Pulse
              </Link>
            </div>
          </div>
        </section>

        {/* 8. FREE REALITY CHECK INTAKE */}
        <section id="start" className="section start-section">
          <div className="wrap start-grid">
            <div>
              <p className="eyebrow">Free Automated Reality Check</p>
              <h2 className="offer-title">Run an Instant Automated Public Scan</h2>
              <p className="section-intro">
                <strong>Paste your business link for an instant automated check — and know exactly how it differs from a personalized BaraTrust report.</strong>
              </p>
              <p>
                This free tool runs an <strong>automated software scan</strong> on a single public URL in seconds so you can see surface technical and contact signals right away:
              </p>
              <ul className="offer-details">
                <li>Public website setup, HTTPS security, and mobile viewport readiness</li>
                <li>Visible customer contact paths, tap-to-call links, and action callouts</li>
                <li>Public trust signals, location clarity, and structured search metadata</li>
                <li>Optional “Discuss My Results” follow-up if you want to talk with Todd &amp; Noelah afterward</li>
              </ul>
              <p>
                <strong>100% free automated scan. No email required to see your initial results. No credit card. No obligation.</strong>
              </p>
              <div className="starter-note">
                <strong>Automated scan vs. personalized human-researched report:</strong>
                <span>
                  This online tool does <strong>not</strong> perform manual human research across third-party menus, delivery apps, competitors, local event calendars, or supplier pricing. Those custom, human-researched reports (1 written report each month + time-sensitive heads-ups) are what{" "}
                  <strong>Business Pulse ($99/month)</strong> members receive — though we occasionally prepare a complimentary one-time sample edition selectively by invitation when reviewing a business.
                </span>
              </div>
              <div className="cta-row">
                <a className="btn primary" href="#reality-check-form">
                  Run Free Reality Check
                </a>
                <PulseCheckoutLink surface="intake_section" className="btn secondary">
                  Start Business Pulse — $99/mo
                </PulseCheckoutLink>
                <BookingLink surface="intake_section" className="btn secondary">
                  Book a Free 15-Minute Conversation
                </BookingLink>
              </div>
              <p className="micro">
                Free automated scan · Business Pulse $99/month when you want ongoing watch.
              </p>
            </div>

            <RealityCheckFunnel variant="embedded" />
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap footer-wrap">
          <div>
            <strong>BaraTrust</strong>
            <p>
              BaraTrust watches your business so you don’t have to. Protect • Improve • Grow • Save.
            </p>
            <p style={{ fontSize: "0.84rem", opacity: 0.85, marginTop: "6px" }}>
              Serving local business owners across Southern Indiana (New Albany, Jeffersonville, Clarksville) and Greater Louisville, KY.
            </p>
          </div>
          <div className="footer-links">
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
              <Link href="/pricing">Business Pulse ($99/mo)</Link>
              <Link
                href="/sample-pulse"
                onClick={() => trackPublicConversionEvent("sample_pulse_viewed", "footer")}
              >
                Sample Pulse
              </Link>
              <Link href="/reality-check">Free Reality Check</Link>
              <BookingLink surface="footer">Book a Free 15-Minute Conversation</BookingLink>
              <Link href="/terms">Terms</Link>
            </div>
            <a href="mailto:todd@baratrust.com">todd@baratrust.com</a>
            <span>© 2026 BaraTrust</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
