"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import "./landing.css";

interface ScanSummary {
  realityCheckId: string;
  shareToken: string;
  scanStatus: "completed" | "failed" | "blocked" | "timeout";
  overallScore: number | null;
  overallCoverage?: number;
  confidence?: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";
  scoreBreakdown: {
    digitalPresence: number | null;
    customerJourney: number | null;
    trustReputation: number | null;
    localDiscovery: number | null;
    opportunityCapture: number | null;
    coverage?: {
      overall: number;
      confidence: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";
      digitalPresence: number;
      customerJourney: number;
      trustReputation: number;
      localDiscovery: number;
      opportunityCapture: number;
    };
  } | null;
  findingsCount: number;
}

export default function LandingPage() {
  const [theme, setTheme] = useState("light");
  const [pending, setPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [scanSummary, setScanSummary] = useState<ScanSummary | null>(null);

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    const form = e.target as HTMLFormElement;
    if (!form.reportValidity()) return;

    setPending(true);
    setErrorMsg("");

    const formData = new FormData(form);
    const payload = {
      businessName: formData.get("business")?.toString().trim() || "",
      website: formData.get("website")?.toString().trim() || "",
      cityState: formData.get("city")?.toString().trim() || "",
      ownerName: formData.get("name")?.toString().trim() || "",
      email: formData.get("email")?.toString().trim() || "",
      phone: formData.get("phone")?.toString().trim() || null,
      businessType: formData.get("business_type")?.toString().trim() || null,
      primaryHeadache: formData.get("problem")?.toString().trim() || null,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 28000);

    try {
      const response = await fetch("/api/reality-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Submission could not be completed.");
      }

      setScanSummary({
        realityCheckId: result.realityCheckId,
        shareToken: result.shareToken,
        scanStatus: result.scanStatus,
        overallScore: result.overallScore,
        overallCoverage: result.overallCoverage,
        confidence: result.confidence,
        scoreBreakdown: result.scoreBreakdown,
        findingsCount: result.findingsCount || 0,
      });
    } catch (err: any) {
      if (err.name === "AbortError") {
        setErrorMsg(
          "The scan took longer than expected. Your submission has been received and queued for human review by Todd and Noelah."
        );
      } else {
        setErrorMsg(
          err.message ||
            "We couldn’t confirm your request. Your details are still here. Please try again or email todd@baratrust.com."
        );
      }
    } finally {
      clearTimeout(timeout);
      setPending(false);
    }
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
            <a href="#services">What we help with</a>
            <a href="#how">How it works</a>
            <a href="#who">Who it’s for</a>
            <a className="nav-cta" href="#start">
              Get your free Reality Check
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
        {/* 1. HERO + 2. PROBLEM SECTION */}
        <section className="hero">
          <div className="wrap hero-grid">
            <div>
              <p className="eyebrow">Human judgment. AI leverage. Real execution.</p>
              <h1>Run your business. We’ll help with the rest.</h1>
              <p className="hero-copy">
                Get more customers. Lose fewer opportunities. Cut unnecessary costs. Automate the busywork.
              </p>
              <p className="section-intro" style={{ marginTop: "14px" }}>
                BaraTrust helps small businesses find what’s leaking time, money, or customers — and fix the problems that actually matter, with Todd and Noelah reviewing the work.
              </p>
              <div className="cta-row">
                <a className="btn primary" href="#start">
                  Get Your Free Reality Check
                </a>
                <a className="btn secondary" href="#services">
                  See What We Can Help With
                </a>
              </div>
              <p className="micro">Free. No credit card. No giant sales pitch.</p>
            </div>

            <aside className="reality-card">
              <p className="card-kicker">
                Small businesses usually don’t have one big problem. They have ten little ones quietly costing time and money:
              </p>
              <ul>
                <li>Customers can’t easily find or trust you online</li>
                <li>Calls, messages, or quote requests fall through the cracks</li>
                <li>Past leads and old quotes never get followed up</li>
                <li>Websites or social pages look outdated or unclear</li>
                <li>Repeat work gets done the hard way every week</li>
                <li>Suppliers, tools, or monthly services cost more than they should</li>
                <li>Good growth opportunities sit untouched because nobody has time</li>
              </ul>
              <p className="card-bottom">We start with the leaks that matter most.</p>
            </aside>
          </div>
        </section>

        {/* 3. WHY BARATRUST */}
        <section className="proof-strip">
          <div className="wrap proof-grid">
            <div>
              <strong>Built for small businesses</strong>
              <span>No enterprise jargon. No agency smoke. No software you have to learn on nights and weekends.</span>
            </div>
            <div>
              <strong>Keep what already works</strong>
              <span>If something is already working, we don’t tear it up just to sell you a new package.</span>
            </div>
            <div>
              <strong>Human judgment. AI leverage.</strong>
              <span>We use modern tools to research, create, organize, and automate faster — with Todd and Noelah reviewing what goes out.</span>
            </div>
          </div>
        </section>

        {/* 4. FOUR CORE OUTCOME AREAS + 5. CAPABILITIES */}
        <section id="services" className="section">
          <div className="wrap">
            <p className="eyebrow">What we can help with</p>
            <h2>Four core outcome areas.</h2>
            <p className="section-intro">
              If it doesn’t help make money, save money, save time, or make the business easier to run, it probably isn’t the priority.
            </p>

            <div className="service-grid">
              <article className="service-card">
                <span className="number">01</span>
                <h3>Get More Customers</h3>
                <p>Help local buyers find you, trust you, and choose you.</p>
                <ul>
                  <li>Local visibility and search presence</li>
                  <li>Cleaner websites, landing pages, or online stores</li>
                  <li>Better offers and promotional campaigns</li>
                  <li>Social content that looks alive and credible</li>
                  <li>Short-form video, commercials, graphics, and product visuals</li>
                  <li>Local lead or account research</li>
                  <li>Catering, wholesale, B2B, or neighborhood opportunities</li>
                </ul>
              </article>

              <article className="service-card">
                <span className="number">02</span>
                <h3>Lose Fewer Opportunities</h3>
                <p>Stop letting warm inquiries and past quotes slip away.</p>
                <ul>
                  <li>Missed-call and inquiry follow-up</li>
                  <li>Quote and estimate follow-up</li>
                  <li>Simpler contact and lead-capture paths</li>
                  <li>Online ordering or booking improvements</li>
                  <li>Catering, special-order, and large-job inquiry capture</li>
                  <li>Dormant-customer reactivation</li>
                  <li>Customer journey improvements</li>
                </ul>
              </article>

              <article className="service-card">
                <span className="number">03</span>
                <h3>Cut Unnecessary Costs</h3>
                <p>Spot recurring waste and Trim expenses that aren’t earning their keep.</p>
                <ul>
                  <li>Supplier and vendor research</li>
                  <li>Software and subscription cleanup</li>
                  <li>Fee and service comparisons</li>
                  <li>Process waste</li>
                  <li>Unnecessary marketing spend</li>
                  <li>Tools you pay for but barely use</li>
                </ul>
              </article>

              <article className="service-card">
                <span className="number">04</span>
                <h3>Automate the Busywork</h3>
                <p>Turn repeat headaches into simple, reliable systems.</p>
                <ul>
                  <li>SOPs from videos, photos, or rough notes</li>
                  <li>Onboarding and training materials</li>
                  <li>Checklists and repeatable internal processes</li>
                  <li>Follow-up workflows</li>
                  <li>Recurring reporting and reminders</li>
                  <li>Customer-data and spreadsheet cleanup</li>
                  <li>Repetitive admin task automation</li>
                </ul>
              </article>
            </div>

            <div className="starter-note" style={{ marginTop: "32px" }}>
              <strong>We find the problem first. Then we decide whether anything actually needs to be built.</strong>
              <span>
                When execution is needed, we can help with websites and ecommerce pages, commercials and promotional videos, short-form social video, social media graphics and campaigns, virtual product photography, audio ads and jingles, SOPs and training materials, lead research and outreach lists, and workflow automation.
              </span>
            </div>
          </div>
        </section>

        {/* 6. HOW IT WORKS */}
        <section id="how" className="section alt">
          <div className="wrap">
            <p className="eyebrow">How it works</p>
            <h2>We look first. Then we fix what matters.</h2>
            <div className="steps">
              <div className="step">
                <span>1</span>
                <h3>Free Reality Check</h3>
                <p>
                  Tell us who you are, share your website, and answer a few optional questions. Our system checks your public web presence first, then Todd and Noelah review the business like a real customer and operator would.
                </p>
              </div>
              <div className="step">
                <span>2</span>
                <h3>We Look Deeper</h3>
                <p>
                  We check findability, customer experience, missed opportunities, competitors, reputation patterns, social presence, and practical growth opportunities.
                </p>
              </div>
              <div className="step">
                <span>3</span>
                <h3>You Get the Priorities</h3>
                <p>
                  You receive a clear BaraTrust Reality Check showing what’s working, what’s getting in the way, the top 3 things we’d fix first, opportunities we found, and what we would NOT spend money on.
                </p>
              </div>
              <div className="step">
                <span>4</span>
                <h3>You Decide What Happens Next</h3>
                <p>
                  Take the report and fix things yourself. Hire somebody else. Or ask BaraTrust to help. No obligation.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 7. WHO IT'S FOR */}
        <section id="who" className="section">
          <div className="wrap who-grid">
            <div>
              <p className="eyebrow">Who it’s for</p>
              <h2>Small businesses that are too busy to become tech companies.</h2>
              <p className="section-intro">
                Contractors, restaurants, retailers, local service businesses, makers, trades, independent operators, and small teams wearing ten hats.
              </p>
            </div>
            <div className="quote-box">
              <p>
                “I know some of this probably needs fixed. I just don’t have time to figure out what matters.”
              </p>
              <span>That’s the customer we built BaraTrust for.</span>
            </div>
          </div>
        </section>

        {/* 8. NO AI HOMEWORK */}
        <section className="section dark">
          <div className="wrap">
            <p className="eyebrow">No AI homework</p>
            <h2>We use modern tools. You don’t have to.</h2>
            <p className="section-intro light-copy">
              AI helps BaraTrust research faster, organize information, create content, analyze patterns, and automate repetitive work. But BaraTrust is human-led. Todd and Noelah review the work, make the judgment calls, and stay accountable for what is recommended.
            </p>
            <p className="light-copy">
              <strong>You run the business. We use the tools.</strong> No giant software migration. No complicated dashboards. No forcing you to learn AI.
            </p>
          </div>
        </section>

        {/* 9. FREE REALITY CHECK + 10. INTAKE SECTION */}
        <section id="start" className="section start-section">
          <div className="wrap start-grid">
            <div>
              <p className="eyebrow">Start simple</p>
              <h2 className="offer-title">Start With the Free Business Reality Check</h2>
              <p className="section-intro">
                <strong>Not sure what your business actually needs? That’s the point. Start with the Reality Check.</strong>
              </p>
              <p>What the Reality Check includes:</p>
              <ul className="offer-details">
                <li>Automated website and digital-presence checks</li>
                <li>Optional owner context questionnaire</li>
                <li>Human review by Todd and Noelah</li>
                <li>Competitor and findability look</li>
                <li>Clear priorities in plain English</li>
                <li>What we would NOT recommend spending money on</li>
              </ul>
              <p>
                <strong>100% free. No credit card required. No giant report. No software pitch. No obligation.</strong>
              </p>
              <div className="starter-note">
                <strong>How follow-up work is scoped</strong>
                <span>
                  If you want help after the report, we scope the work clearly based on what your business actually needs — whether that’s a focused fix, a build project, or ongoing help.
                </span>
              </div>
              <div className="cta-row">
                <a className="btn primary" href="#reality-check-form">
                  Get My Free Reality Check
                </a>
              </div>
              <p className="micro">
                No payment. No obligation.
              </p>
            </div>

            {scanSummary ? (
              <div id="reality-check-form" className="lead-form" aria-live="polite">
                <p className="eyebrow" style={{ marginBottom: "8px" }}>
                  Submission Saved &amp; Initial Scan Complete
                </p>
                <h3 id="intake-title">Your Reality Check is underway.</h3>
                <p>
                  We’ve saved your submission and completed the initial automated checks. Todd and Noelah will personally review your local findability, reputation, and competitors next.
                </p>

                {scanSummary.overallScore !== null ? (
                  <div className="starter-note" style={{ marginTop: "18px", marginBottom: "18px" }}>
                    <strong>Initial Automated Score: {scanSummary.overallScore} / 100</strong>
                    <span>
                      {scanSummary.confidence === "HIGH"
                        ? "Verified automated coverage across your public web presence."
                        : `Provisional automated check (${scanSummary.overallCoverage ?? 0}% coverage) — queued for human review.`}
                    </span>
                  </div>
                ) : (
                  <div className="starter-note" style={{ marginTop: "18px", marginBottom: "18px" }}>
                    <strong>Queued for Human Review</strong>
                    <span>
                      Your website had bot/firewall restrictions during the automated probe, so Todd and Noelah will inspect it directly by hand.
                    </span>
                  </div>
                )}

                <div className="starter-note" style={{ marginTop: "18px", marginBottom: "22px" }}>
                  <strong>Optional Step 2: Owner Context (~2 minutes)</strong>
                  <span>
                    Want to share where your customers come from, whether calls or quotes get missed, or what busywork wastes your time? Answer a few optional questions so Todd and Noelah can tailor your review.
                  </span>
                </div>

                <Link
                  className="btn primary full"
                  href={`/reality-check/${scanSummary.shareToken}/questionnaire`}
                >
                  Answer Optional Context Questions
                </Link>
              </div>
            ) : (
              <form
                id="reality-check-form"
                className="lead-form"
                onSubmit={handleSubmit}
                aria-labelledby="intake-title"
                aria-describedby="intake-note form-availability"
              >
                <h3 id="intake-title">Tell us about your business.</h3>
                <p id="intake-note">
                  Start with the basics. We’ll save your submission first, run the automated checks, and then give you the option to answer a few extra questions so Todd and Noelah have more context.
                </p>
                <label>
                  Business name
                  <input name="business" type="text" autoComplete="organization" required />
                </label>
                <label>
                  Website / primary page address
                  <input
                    name="website"
                    type="text"
                    inputMode="url"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="e.g., yourbusiness.com"
                    required
                  />
                </label>
                <label>
                  City &amp; State
                  <input
                    name="city"
                    type="text"
                    placeholder="e.g., New Albany, IN or Louisville, KY"
                    required
                  />
                </label>
                <label>
                  Owner / contact name
                  <input name="name" type="text" autoComplete="name" required />
                </label>
                <label>
                  Email
                  <input name="email" type="email" autoComplete="email" required />
                </label>
                <label>
                  Phone (optional)
                  <input name="phone" type="tel" autoComplete="tel" />
                </label>
                <label>
                  Business type (optional)
                  <input
                    name="business_type"
                    type="text"
                    placeholder="e.g., contractor, restaurant, retailer"
                  />
                </label>
                <label>
                  Biggest bottleneck right now (optional)
                  <textarea name="problem" rows={3}></textarea>
                </label>
                <button className="btn primary full" type="submit" disabled={pending}>
                  {pending ? "Saving & Running Checks..." : "Start My Free Reality Check"}
                </button>
                <p id="form-availability" className="form-note">
                  No payment. No obligation.
                </p>
                <p id="form-status" className="form-note" role="status" aria-live="polite" tabIndex={-1}>
                  {errorMsg}
                </p>
              </form>
            )}
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap footer-wrap">
          <div>
            <strong>BaraTrust</strong>
            <p>Practical small-business growth and operations partner.</p>
          </div>
          <div className="footer-links">
            <a href="mailto:todd@baratrust.com">todd@baratrust.com</a>
            <span>© 2026 BaraTrust</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
