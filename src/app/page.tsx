"use client";

import { useState, useEffect } from "react";
import RealityCheckFunnel from "@/components/RealityCheckFunnel";
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
                  Run My Free Reality Check
                </a>
                <a className="btn secondary" href="#services">
                  See What We Can Help With
                </a>
              </div>
              <p className="micro">Paste your business link and see what we find. No email required to see your first results.</p>
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
                <p>Spot recurring waste and trim expenses that aren’t earning their keep.</p>
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
                <h3>Paste Your Link</h3>
                <p>
                  Paste your website, Google Business page, or Facebook page. Our system runs an instant automated scan so you can see your initial snapshot right away — no email required.
                </p>
              </div>
              <div className="step">
                <span>2</span>
                <h3>Request Human Review</h3>
                <p>
                  Want the full Reality Check? Add your email and optionally answer a few quick questions so Todd and Noelah can review the parts software can’t.
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

        {/* 9. FREE REALITY CHECK + 10. STAGED INTAKE SECTION */}
        <section id="start" className="section start-section">
          <div className="wrap start-grid">
            <div>
              <p className="eyebrow">Start simple</p>
              <h2 className="offer-title">Start With Your Business</h2>
              <p className="section-intro">
                <strong>Paste your business link and see what we find.</strong>
              </p>
              <p>What the full Reality Check includes:</p>
              <ul className="offer-details">
                <li>Instant automated website and digital-presence snapshot</li>
                <li>Human review by Todd and Noelah</li>
                <li>Optional owner context questionnaire</li>
                <li>Competitor and findability look</li>
                <li>Clear priorities in plain English</li>
                <li>What we would NOT recommend spending money on</li>
              </ul>
              <p>
                <strong>100% free. No email required to see your first results. No credit card. No obligation.</strong>
              </p>
              <div className="starter-note">
                <strong>How follow-up work is scoped</strong>
                <span>
                  If you want help after the report, we scope the work clearly based on what your business actually needs — whether that’s a focused fix, a build project, or ongoing help.
                </span>
              </div>
              <div className="cta-row">
                <a className="btn primary" href="#reality-check-form">
                  Run My Free Reality Check
                </a>
              </div>
              <p className="micro">
                No payment. No obligation.
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
