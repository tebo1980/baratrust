"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import "./landing.css";

export default function LandingPage() {
  const router = useRouter();
  const [theme, setTheme] = useState("light");
  const [pending, setPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
    let savedTheme;
    try { savedTheme = localStorage.getItem("baratrust-theme"); } catch (_) {}
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
    try { localStorage.setItem("baratrust-theme", newTheme); } catch (_) {}
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    const form = e.target as HTMLFormElement;
    if (!form.reportValidity()) return;
    setPending(true);
    setErrorMsg("");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    let confirmed = false;
    try {
      const response = await fetch("https://formspree.io/f/xeaovlgo", {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok || result.ok !== true) throw new Error("Submission not confirmed");
      confirmed = true;
      router.push("/thank-you");
    } catch (_) {
      setErrorMsg("We couldn’t confirm your request. Your details are still here. Please try again or email todd@baratrust.com.");
    } finally {
      clearTimeout(timeout);
      if (!confirmed) setPending(false);
    }
  };

  return (
    <div className="landing-wrapper" data-theme={theme}>
      
<header className="site-header"><div className="wrap nav-wrap"><a className="brand" href="#top"><span className="brand-mark">B</span><span>BaraTrust</span></a><nav><a href="#services">Services</a><a href="#how">How it works</a><a href="#who">Who it’s for</a><a className="nav-cta" href="#start">Get help</a><button id="theme-toggle" className="theme-toggle" type="button" aria-pressed={theme === "dark"} onClick={toggleTheme}>{theme === "dark" ? "Day mode" : "Night mode"}</button></nav></div></header>
<main id="top">
<section className="hero"><div className="wrap hero-grid"><div><p className="eyebrow">Small-business digital cleanup + growth support</p><h1>Recover missed money. Clean up the mess. Turn work you already did into marketing.</h1><p className="hero-copy">BaraTrust uses AI where it saves time, and people where judgment matters. Todd and Noella personally review data, follow up on lost revenue, and step in when trust is on the line.</p><div className="cta-row"><a className="btn primary" href="#start">Get My Reality Check</a><a className="btn secondary" href="#services">See what we do</a></div><p className="micro">$49 Digital Reality Check. No payment due with your inquiry.</p></div><aside className="reality-card"><p className="card-kicker">A typical BaraTrust cleanup might find:</p><ul><li>Customers can’t find a working website</li><li>Business info is inconsistent across the web</li><li>Missed calls and old estimates never get followed up</li><li>Customer lists are scattered across phones and spreadsheets</li><li>Social pages look abandoned</li><li>You have no idea which marketing actually makes money</li></ul><p className="card-bottom">We start with the leaks that matter most.</p></aside></div></section>
<section className="proof-strip"><div className="wrap proof-grid"><div><strong>Built for small businesses</strong><span>Not enterprise teams.</span></div><div><strong>Use what you already have</strong><span>No forced rip-and-replace.</span></div><div><strong>AI stays behind the scenes</strong><span>You get results, not homework.</span></div></div></section>
<section id="services" className="section"><div className="wrap"><p className="eyebrow">What we do</p><h2>Four practical service lanes.</h2><p className="section-intro">We keep the menu small on purpose. If it doesn’t save time, recover money, or make the business easier to find, it probably doesn’t belong here.</p><div className="service-grid">
<article className="service-card"><span className="number">01</span><h3>Revenue Recovery</h3><p>We look for money and customers you may already be losing.</p><ul><li>Missed-call follow-up</li><li>Stale estimate follow-up</li><li>Abandoned inquiries</li><li>Dormant-customer reactivation</li><li>Overdue invoice reminders</li><li>Review-request recovery</li><li>Identifying follow-up gaps</li></ul></article>
<article className="service-card"><span className="number">02</span><h3>Digital Cleanup</h3><p>We fix the online and back-office mess that quietly costs time and trust.</p><ul><li>Google Business Profile/listing cleanup</li><li>Broken links</li><li>Inconsistent contact information</li><li>Website cleanup</li><li>Customer-list cleanup</li><li>Duplicate contacts</li><li>Spreadsheets/exports cleanup</li><li>CRM/database organization</li></ul></article>
<article className="service-card"><span className="number">03</span><h3>Simple Web Presence</h3><p>A clean place to send customers without turning your business into a tech project.</p><ul><li>One-page small-business website</li><li>Services/about/contact</li><li>Map/call/form links</li><li>Booking/order links</li><li>Mobile-friendly layout</li><li>Basic copy cleanup</li></ul></article>
<article className="service-card"><span className="number">04</span><h3>Work-to-Marketing</h3><p>You do the job. We turn it into content people can actually see.</p><ul><li>Jobsite photos/video cleanup</li><li>Before/after content</li><li>Social posts</li><li>Short-form video</li><li>Testimonial/review follow-up</li><li>Project pages/case-study content</li><li>Print/social campaign assets</li></ul></article>
</div></div></section>
<section id="how" className="section alt"><div className="wrap"><p className="eyebrow">How it works</p><h2>We look first. Then we fix what matters.</h2><div className="steps"><div className="step"><span>1</span><h3>Reality Check</h3><p>We look at your current setup, listen to what wastes your time, and identify the leaks worth fixing.</p></div><div className="step"><span>2</span><h3>Simple Plan</h3><p>You get a short, plain-English list: what’s wrong, what matters, what we recommend, and what it will cost.</p></div><div className="step"><span>3</span><h3>We Do the Work</h3><p>We clean, build, organize or automate the agreed pieces. You approve anything customer-facing or consequential.</p></div><div className="step"><span>4</span><h3>Keep It or Keep Us</h3><p>Take the finished work and move on, or keep us around for ongoing cleanup, creative and follow-up.</p></div></div></div></section>
<section id="who" className="section"><div className="wrap who-grid"><div><p className="eyebrow">Who it’s for</p><h2>Small businesses that are too busy to become tech companies.</h2><p className="section-intro">Contractors, retailers, restaurants, local services, makers, trades and other small teams that need practical help without agency-sized bills.</p></div><div className="quote-box"><p>“I know this stuff needs fixed. I just don’t have time to learn five new tools and spend my nights messing with it.”</p><span>That’s the customer we built BaraTrust for.</span></div></div></section>
<section className="section dark"><div className="wrap"><p className="eyebrow">No AI homework</p><h2>We use modern tools. You don’t have to.</h2><p className="section-intro light-copy">AI, automation and research tools help us work faster behind the scenes. But the service is human-led, reviewed, and built around your business. We don’t hand you another dashboard and disappear.</p><p className="light-copy"><strong>What we don’t do:</strong> No giant software migration. No complicated dashboards. No forcing you to learn AI.</p></div></section>
<section id="start" className="section start-section">
  <div className="wrap start-grid">
    <div>
      <p className="eyebrow">Start simple</p>
      <h2 className="offer-title">Small Business Digital Reality Check — $49</h2>
      <p className="section-intro"><strong>Not sure what’s actually worth fixing?</strong></p>
      <p className="section-intro">We’ll review your website, Google presence, basic local visibility, contact and follow-up gaps, customer-data setup, and obvious missed opportunities.</p>
      <p>You get a short, plain-English priority list covering:</p>
      <ul className="offer-details">
        <li>Digital mess</li><li>Missed revenue opportunities</li><li>Broken or missing pieces</li><li>What matters most</li><li>What BaraTrust would fix first</li>
      </ul>
      <p><strong>Baseline Launch Prices:</strong></p>
      <ul className="offer-details">
        <li>Digital Reality Check — $49</li>
        <li>Digital Cleanup — starting at $199</li>
        <li>Customer Data Cleanup — starting at $199</li>
        <li>Follow-Up / Revenue Recovery Setup — starting at $249</li>
        <li>Starter Website — starting at $399</li>
        <li>Larger Business Data + Marketing Support — custom quote</li>
      </ul>
      <p><strong>No giant report. No software pitch. No obligation.</strong></p>
      <div className="starter-note">
        <strong>Your $49 can go toward the fixes.</strong>
        <span>If you hire BaraTrust for $199+ of follow-up work within 30 days, we’ll credit the full $49 toward the project.</span>
      </div>
      <div className="cta-row"><a className="btn primary" href="#reality-check-form">Get My Reality Check</a></div>
      <p className="micro">Send a short inquiry. We review it, send you a payment link, and start your Reality Check after payment.</p>
    </div>
    <form id="reality-check-form" className="lead-form" action="https://formspree.io/f/xeaovlgo" method="POST" onSubmit={handleSubmit} aria-labelledby="intake-title" aria-describedby="intake-note form-availability">
      <h3 id="intake-title">Tell us about your business.</h3>
      <p id="intake-note">Request your $49 Reality Check below. No payment is collected here, and there’s no obligation to buy follow-up work.</p>
      <label>Business name<input name="business" type="text" autoComplete="organization" required /></label>
      <label>Owner / contact name<input name="name" type="text" autoComplete="name" required /></label>
      <label>Email<input name="email" type="email" autoComplete="email" required /></label>
      <label>Phone (optional)<input name="phone" type="tel" autoComplete="tel" /></label>
      <label>Website / Facebook page (optional)<input name="website" type="text" inputMode="url" autoCapitalize="none" spellCheck="false" placeholder="Website or Facebook page address" /></label>
      <label>Business type<input name="business_type" type="text" placeholder="e.g., contractor, restaurant, retailer" required /></label>
      <label>Biggest headache<textarea name="problem" rows={3} required></textarea></label>
      <label>Anything else we should know? (optional)<textarea name="notes" rows={3}></textarea></label>
      <button className="btn primary full" type="submit" disabled={pending}>{pending ? "Sending..." : "Request My Reality Check"}</button>
      <p id="form-availability" className="form-note">We’ll review your inquiry and email you with next steps and the $49 payment link.</p>
      <p id="form-status" className="form-note" role="status" aria-live="polite" tabIndex={-1}>{errorMsg}</p>
    </form>
  </div>
</section>
</main>
<footer><div className="wrap footer-wrap"><div><strong>BaraTrust</strong><p>Practical digital help for small businesses.</p></div><div className="footer-links"><a href="mailto:todd@baratrust.com">todd@baratrust.com</a><span>© 2026 BaraTrust</span></div></div></footer>

    </div>
  );
}
