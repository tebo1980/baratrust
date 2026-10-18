"use client";
import { useState, useEffect } from "react";
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
      <header className="site-header"><div className="wrap nav-wrap"><a className="brand" href="/#top"><span className="brand-mark">B</span><span>BaraTrust</span></a><nav><a href="/#pillars">What we help with</a><a href="/#how-it-works">How it works</a><a href="/#who">Who it’s for</a><a className="nav-cta" href="/#start">Get your free Reality Check</a><button id="theme-toggle" className="theme-toggle" type="button" aria-pressed={theme === "dark"} onClick={toggleTheme}>Night mode</button></nav></div></header>
      <main><section className="section"><div className="wrap">
        <p className="eyebrow">BaraTrust Business Reality Check</p>
        <h1>We received your request.</h1>
        <p className="section-intro">Todd and Noelah will run your initial checks and personally review your findability, customer experience, missed opportunities, and local market.</p>
        <p className="section-intro">You will receive your complete, human-reviewed Reality Check report directly in your inbox within one business day. It is 100% free — no credit card required, and no obligation.</p>
        <div className="cta-row"><a className="btn primary" href="/">Back to BaraTrust</a></div>
      </div></section></main>
      <footer><div className="wrap footer-wrap"><div><strong>BaraTrust</strong><p>Practical small-business growth and operations partner.</p></div><div className="footer-links"><a href="mailto:todd@baratrust.com">todd@baratrust.com</a><span>© 2026 BaraTrust</span></div></div></footer>
    </div>
  );
}