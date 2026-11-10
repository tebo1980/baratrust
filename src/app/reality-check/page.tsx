"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import RealityCheckFunnel from "@/components/RealityCheckFunnel";
import { BookingLink, PulseCheckoutLink } from "@/components/ContactLinks";
import "../landing.css";

export default function RealityCheckPage() {
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
          <Link className="brand" href="/">
            <span className="brand-mark">B</span>
            <span>BaraTrust</span>
          </Link>
          <nav>
            <Link href="/#services">What we watch</Link>
            <Link href="/#pulse">Business Pulse · $99/mo</Link>
            <Link href="/sample-pulse">Sample Pulse</Link>
            <Link href="/#how">How it works</Link>
            <Link className="nav-cta" href="/">
              ← Back to Homepage
            </Link>
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
        <section className="section start-section" style={{ minHeight: "calc(100vh - 150px)" }}>
          <div className="wrap start-grid">
            <div>
              <p className="eyebrow">Free Automated Reality Check</p>
              <h1 className="offer-title" style={{ marginBottom: "18px" }}>
                Instant Automated Public Link Scan
              </h1>
              <p className="section-intro">
                <strong>Paste your website, Google Business page, or Facebook business page for an instant automated check — no email required.</strong>
              </p>
              <p>
                This self-serve tool runs an <strong>automated software scan</strong> on one public URL in seconds so you can see surface technical and contact signals right away. It is intentionally distinct from a personalized, human-researched BaraTrust report.
              </p>

              <p>What this free automated scan checks on your link:</p>
              <ul className="offer-details">
                <li>
                  <strong>Digital Presence (20%):</strong> HTTPS security, mobile setup, search title &amp; metadata
                </li>
                <li>
                  <strong>Customer Journey (25%):</strong> Tap-to-call links, visible contact paths, and inquiry friction
                </li>
                <li>
                  <strong>Trust &amp; Reputation (20%):</strong> Public trust signals, policy links, and address clarity
                </li>
                <li>
                  <strong>Local Discovery (20%):</strong> Local search findability and structured business schema
                </li>
                <li>
                  <strong>Opportunity Capture (15%):</strong> Lead forms, action callouts, and honest flags where human verification applies
                </li>
              </ul>

              <div className="starter-note">
                <strong>How this differs from a personalized report — &amp; what $99/month includes:</strong>
                <span>
                  An automated scan cannot manually cross-check third-party menus, delivery apps, nearby competitors, local event deadlines, or supplier pricing. Inside{" "}
                  <Link href="/pricing" style={{ textDecoration: "underline", fontWeight: 700 }}>
                    Business Pulse ($99/month)
                  </Link>
                  , Todd &amp; Noelah deliver <strong>1 written human-researched report each month</strong> (PDF/brief with clickable sources &amp; Decision Cards) <strong>plus quick heads-ups in between</strong> only when something time-sensitive comes up. Act on any recommendation in-house for $0 extra, or request an upfront flat project quote for hands-on implementation.{" "}
                  <em>(Complimentary one-time sample editions are prepared selectively by invitation when reviewing a business.)</em>{" "}
                  <PulseCheckoutLink
                    surface="reality_check_page"
                    style={{ textDecoration: "underline", fontWeight: 700 }}
                  >
                    Start Business Pulse →
                  </PulseCheckoutLink>
                  {" or "}
                  <BookingLink
                    surface="reality_check_page"
                    style={{ textDecoration: "underline", fontWeight: 700 }}
                  >
                    Book a Free 15-Minute Conversation →
                  </BookingLink>
                </span>
              </div>

              <p className="micro">
                100% free automated snapshot. No credit card required. No obligation. Serving Southern Indiana &amp; Greater Louisville.
              </p>
            </div>

            <RealityCheckFunnel variant="standalone" />
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap footer-wrap">
          <div>
            <strong>BaraTrust</strong>
            <p>BaraTrust watches your business so you don’t have to. Protect • Improve • Grow • Save.</p>
          </div>
          <div className="footer-links">
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
              <Link href="/pricing">Business Pulse ($99/mo)</Link>
              <Link href="/sample-pulse">Sample Pulse</Link>
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
