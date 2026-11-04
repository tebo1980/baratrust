"use client";
import { useState, useEffect } from "react";
import { BUSINESS_PULSE_STRIPE_URL } from "@/components/ContactLinks";
import "../landing.css";

export default function ThankYouPage() {
  const [theme, setTheme] = useState("light");

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

  return (
    <div className="landing-wrapper" data-theme={theme} style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--ink)" }}>
      <header className="site-header"><div className="wrap nav-wrap"><a className="brand" href="/#top"><span className="brand-mark">B</span><span>BaraTrust</span></a><nav><a href="/#services">What we watch</a><a href="/#pulse">Business Pulse · $99/mo</a><a href="/#how">How it works</a><a href="/#who">Who it’s for</a><a className="nav-cta" href="/#start">Free Reality Check</a><button id="theme-toggle" className="theme-toggle" type="button" aria-pressed={theme === "dark"} onClick={toggleTheme}>{theme === "dark" ? "Day mode" : "Night mode"}</button></nav></div></header>
      <main><section className="section"><div className="wrap">
        <p className="eyebrow">BaraTrust</p>
        <h1>We received your request.</h1>
        <p className="section-intro">Thank you for sharing your business details with BaraTrust.</p>
        <p className="section-intro">Todd and Noelah have your information and will follow up with your saved snapshot link and straightforward next steps if you want BaraTrust to keep watching your business through Business Pulse ($99/month).</p>
        <div className="cta-row"><a className="btn primary" href={BUSINESS_PULSE_STRIPE_URL} target="_blank" rel="noopener noreferrer">Start Business Pulse — $99/month</a><a className="btn secondary" href="/">Back to BaraTrust</a></div>
      </div></section></main>
      <footer><div className="wrap footer-wrap"><div><strong>BaraTrust</strong><p>BaraTrust watches your business so you don’t have to. Protect • Improve • Grow • Save.</p></div><div className="footer-links"><a href="mailto:todd@baratrust.com">todd@baratrust.com</a><span>© 2026 BaraTrust</span></div></div></footer>
    </div>
  );
}
