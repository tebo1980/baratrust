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
              <p className="eyebrow">Free Reality Check</p>
              <h1 className="offer-title" style={{ marginBottom: "18px" }}>
                See What BaraTrust Can Spot Right Now
              </h1>
              <p className="section-intro">
                <strong>Paste your business link for a free automated outside-looking-in snapshot.</strong>
              </p>
              <p>
                Start with your website, Google Business page, or Facebook business page. You’ll see what our automated scan can spot from publicly visible signals right away — with no email required to view your initial snapshot, and an optional “Discuss My Results” step if you want personal follow-up from Todd &amp; Noelah.
              </p>

              <p>What the automated outside-in snapshot checks:</p>
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
                <strong>Keep BaraTrust watching — Business Pulse ($99/month)</strong>
                <span>
                  The Free Reality Check shows what public automation can see right now. Ongoing monitoring, human verification, local opportunity discovery, and supplier/cost comparisons across{" "}
                  <strong>Protect • Improve • Grow • Save</strong> live inside{" "}
                  <Link href="/pricing" style={{ textDecoration: "underline", fontWeight: 700 }}>
                    Business Pulse ($99/month)
                  </Link>
                  {" — "}
                  <PulseCheckoutLink
                    surface="reality_check_page"
                    style={{ textDecoration: "underline", fontWeight: 700 }}
                  >
                    start Business Pulse now →
                  </PulseCheckoutLink>
                  {" or "}
                  <BookingLink
                    surface="reality_check_page"
                    style={{ textDecoration: "underline", fontWeight: 700 }}
                  >
                    book an intro conversation →
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
              <BookingLink surface="footer">Book Intro Call</BookingLink>
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
