"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import RealityCheckFunnel from "@/components/RealityCheckFunnel";
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
            <Link href="/#services">What we help with</Link>
            <Link href="/#how">How it works</Link>
            <Link href="/#who">Who it’s for</Link>
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
              <p className="eyebrow">Free Business Reality Check</p>
              <h1 className="offer-title" style={{ marginBottom: "18px" }}>
                Start With Your Business
              </h1>
              <p className="section-intro">
                <strong>Paste your business link and see what we find.</strong>
              </p>
              <p>
                Start with only your website, Google Business page, or Facebook business page. We’ll run the first automated scan right away — with no email required to see your initial snapshot.
              </p>

              <p>What the full Reality Check includes:</p>
              <ul className="offer-details">
                <li>
                  <strong>Digital Presence (20%):</strong> HTTPS security, mobile setup, search title &amp; descriptions
                </li>
                <li>
                  <strong>Customer Journey (25%):</strong> Tap-to-call links, clear contact paths, and inquiry friction
                </li>
                <li>
                  <strong>Trust &amp; Reputation (20%):</strong> Reviews, address clarity, and ownership trust signals
                </li>
                <li>
                  <strong>Local Discovery (20%):</strong> Local search findability and structured business schema
                </li>
                <li>
                  <strong>Opportunity Capture (15%):</strong> Lead forms, quote paths, and missed-inquiry safeguards
                </li>
              </ul>

              <div className="starter-note">
                <strong>Human judgment + automated evidence</strong>
                <span>
                  Want the full Reality Check after seeing your first scan? Add your email and Todd &amp; Noelah will review the parts software can’t — including local competitors, reputation, and what we would NOT recommend spending money on.
                </span>
              </div>

              <p className="micro">
                100% free. No credit card required. No obligation.
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