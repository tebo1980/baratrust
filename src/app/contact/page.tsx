"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import CustomerInquiryForm from "@/components/CustomerInquiryForm";
import { BookingLink, PulseCheckoutLink } from "@/components/ContactLinks";
import "../landing.css";

export default function ContactPage() {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
    let savedTheme;
    try {
      savedTheme = localStorage.getItem("baratrust-theme");
    } catch {
      // Ignore storage errors
    }
    if (savedTheme === "dark" || savedTheme === "light") {
      setTheme(savedTheme);
    } else {
      setTheme(systemTheme.matches ? "dark" : "light");
    }

    const listener = (e: MediaQueryListEvent) => {
      try {
        if (!localStorage.getItem("baratrust-theme")) {
          setTheme(e.matches ? "dark" : "light");
        }
      } catch {
        // Ignore storage errors
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
    } catch {
      // Ignore storage errors
    }
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
            <Link href="/reality-check">Free Reality Check</Link>
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
              <p className="eyebrow">Customer Reception &amp; Research Intake</p>
              <h1 className="offer-title" style={{ marginBottom: "18px" }}>
                Ask a Question or Request Custom Research
              </h1>
              <p className="section-intro">
                <strong>
                  Reach Todd &amp; Noelah any time — day or night — for business intelligence or
                  personal research inquiries.
                </strong>
              </p>
              <p>
                We work around real small-business and research schedules, including late hours.
                Send your question here whenever it is convenient for you, and a real person on our
                team will review your note and follow up personally.
              </p>
              <ul className="offer-details">
                <li>
                  <strong>Free Reality Check ($0):</strong> Instant automated public scan on our{" "}
                  <Link href="/reality-check" style={{ textDecoration: "underline", fontWeight: 700 }}>
                    Reality Check page
                  </Link>
                </li>
                <li>
                  <strong>Business Pulse ($99/month):</strong> Ongoing monthly human-researched watch
                  across Protect, Improve, Grow, and Save
                </li>
                <li>
                  <strong>Custom Business &amp; Personal Research:</strong> Scoped individually and
                  quoted upfront before any paid work begins
                </li>
              </ul>

              <div className="starter-note">
                <strong>Prefer to talk live for 15 minutes?</strong>
                <span>
                  You can also choose a convenient slot directly on our verified Google Calendar
                  schedule, or start Business Pulse right away.
                </span>
              </div>

              <div className="cta-row">
                <BookingLink surface="contact_page" className="btn primary">
                  Book a Free 15-Minute Conversation
                </BookingLink>
                <PulseCheckoutLink surface="contact_page" className="btn secondary">
                  Start Business Pulse — $99/mo
                </PulseCheckoutLink>
              </div>
            </div>

            <CustomerInquiryForm />
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
          </div>
          <div className="footer-links">
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
              <Link href="/">Homepage</Link>
              <Link href="/pricing">Business Pulse ($99/mo)</Link>
              <Link href="/reality-check">Free Reality Check</Link>
              <Link href="/terms#privacy">Privacy &amp; Terms</Link>
            </div>
            <a href="mailto:todd@baratrust.com">todd@baratrust.com</a>
            <span>© 2026 BaraTrust</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
