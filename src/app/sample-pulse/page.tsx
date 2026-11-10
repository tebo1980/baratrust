'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ILLUSTRATIVE_RETAIL_PULSE_ITEMS } from '@/components/SampleBusinessPulse';
import { BookingLink, PulseCheckoutLink } from '@/components/ContactLinks';
import { trackPublicConversionEvent } from '@/lib/analytics';
import '../landing.css';

export default function SamplePulsePage() {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    trackPublicConversionEvent('sample_pulse_viewed', 'sample_pulse_page');

    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
    let savedTheme;
    try {
      savedTheme = localStorage.getItem('baratrust-theme');
    } catch (_) {}
    if (savedTheme === 'dark' || savedTheme === 'light') {
      setTheme(savedTheme);
    } else {
      setTheme(systemTheme.matches ? 'dark' : 'light');
    }

    const listener = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('baratrust-theme')) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };
    systemTheme.addEventListener('change', listener);
    return () => systemTheme.removeEventListener('change', listener);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    try {
      localStorage.setItem('baratrust-theme', newTheme);
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
            <Link href="/pricing">Business Pulse · $99/mo</Link>
            <Link href="/reality-check">Free Reality Check</Link>
            <BookingLink surface="nav" className="nav-cta">
              Book a Free 15-Minute Conversation
            </BookingLink>
            <button
              id="theme-toggle"
              className="theme-toggle"
              type="button"
              aria-pressed={theme === 'dark'}
              onClick={toggleTheme}
            >
              {theme === 'dark' ? 'Day mode' : 'Night mode'}
            </button>
          </nav>
        </div>
      </header>

      <main id="top">
        <section className="section">
          <div className="wrap" style={{ maxWidth: '960px' }}>
            <div
              className="starter-note"
              role="note"
              style={{
                marginBottom: '26px',
                padding: '16px 20px',
                borderLeft: '4px solid var(--mint)',
              }}
            >
              <strong>Illustrative Fictional Sample — Disclosure</strong>
              <span>
                “Riverbend Trail &amp; Provisions” is a <strong>fictional specialty retail composite</strong> created to illustrate how BaraTrust organizes evidence, findings, recommendations, and human verification inside Business Pulse ($99/month). It does not represent an actual customer, verified real-world business findings, or achieved financial results.
              </span>
            </div>

            <p className="eyebrow">Illustrative Sample Business Pulse · $99/month</p>
            <h1 style={{ fontSize: 'clamp(2.1rem, 4.2vw, 3.2rem)', marginBottom: '14px' }}>
              Riverbend Trail &amp; Provisions
            </h1>
            <p className="section-intro" style={{ marginTop: 0 }}>
              <strong>Fictional Profile:</strong> Independent outdoor gear &amp; specialty gift storefront in the Southern Indiana / Greater Louisville area · 1 storefront + online shop · Owner-operated.
            </p>
            <p>
              Every Business Pulse cycle looks inside and outside the business across{' '}
              <strong>Protect, Improve, Grow, and Save</strong>. When nothing needs fixing or switching vendors isn’t worth the disruption, we say so plainly.
            </p>

            <div
              className="starter-note"
              style={{
                marginTop: '20px',
                padding: '16px 20px',
              }}
            >
              <strong>How a Personalized Business Pulse ($99/mo) Differs From the Free Automated Reality Check:</strong>
              <span>
                Our free online Reality Check is an <strong>instant automated scan</strong> of a single public link (HTTPS, mobile setup, metadata, contact paths). By contrast, a Business Pulse report like the illustrative example below is <strong>researched and verified by humans (Todd &amp; Noelah)</strong> across third-party listings/menus, local competitors, regional event calendars, and vendor quotes. For <strong>$99/month</strong>, members receive <strong>one written Monthly Business Pulse report</strong> (PDF/brief with clickable sources &amp; Decision Cards) plus <strong>quick heads-ups in between only when something time-sensitive comes up</strong>. You can act on any recommendation yourself for $0 extra; optional hands-on implementation is quoted separately upfront as a flat project fee.
              </span>
            </div>

            <div style={{ display: 'grid', gap: '20px', marginTop: '30px' }}>
              {ILLUSTRATIVE_RETAIL_PULSE_ITEMS.map((item, idx) => (
                <article
                  key={item.pillar}
                  className="service-card"
                  style={{ padding: '24px 26px' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '10px',
                      marginBottom: '10px',
                    }}
                  >
                    <span className="eyebrow" style={{ margin: 0 }}>
                      0{idx + 1} · {item.pillar}
                    </span>
                    <span
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: '999px',
                        border: '1px solid var(--line)',
                      }}
                    >
                      {item.statusBadge}
                    </span>
                  </div>

                  <h2 style={{ fontSize: '1.35rem', marginBottom: '14px' }}>{item.headline}</h2>

                  <div style={{ display: 'grid', gap: '10px', fontSize: '0.94rem' }}>
                    <div>
                      <strong>1. Illustrative Evidence Checked:</strong>{' '}
                      <span>{item.illustrativeEvidence}</span>
                    </div>
                    <div>
                      <strong>2. Finding:</strong> <span>{item.finding}</span>
                    </div>
                    <div>
                      <strong>3. Practical Recommendation:</strong>{' '}
                      <span>{item.recommendation}</span>
                    </div>
                    <div>
                      <strong>4. Verification &amp; Restraint Check:</strong>{' '}
                      <span>{item.verification}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="starter-note" style={{ marginTop: '32px' }}>
              <strong>Want to see what BaraTrust spots on your actual business first?</strong>
              <span>
                Run a Free Reality Check on your public website or Facebook/Google page with no email required, book a 15-minute introductory conversation with Todd &amp; Noelah, or start Business Pulse for $99/month.
              </span>
              <div className="cta-row" style={{ marginTop: '16px' }}>
                <Link className="btn primary" href="/reality-check">
                  Run Free Reality Check
                </Link>
                <PulseCheckoutLink surface="sample_pulse_page" className="btn secondary">
                  Start Business Pulse — $99/month
                </PulseCheckoutLink>
                <BookingLink surface="sample_pulse_page" className="btn secondary">
                  Book a Free 15-Minute Conversation
                </BookingLink>
              </div>
            </div>

            <p className="micro" style={{ marginTop: '18px' }}>
              Reminder: All business details, observations, vendor quotes, and event timelines on this page are fictional examples illustrating the BaraTrust Business Pulse format.
            </p>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap footer-wrap">
          <div>
            <strong>BaraTrust</strong>
            <p>
              Serving independent businesses across Southern Indiana, Greater Louisville, and beyond. Protect • Improve • Grow • Save.
            </p>
          </div>
          <div className="footer-links">
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <Link href="/">Home</Link>
              <Link href="/pricing">Business Pulse ($99/mo)</Link>
              <Link href="/reality-check">Free Reality Check</Link>
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
