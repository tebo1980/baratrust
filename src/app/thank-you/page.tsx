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
      
<header className="site-header"><div className="wrap nav-wrap"><a className="brand" href="/#top"><span className="brand-mark">B</span><span>BaraTrust</span></a><nav><a href="/#services">Services</a><a href="/#how">How it works</a><a href="/#who">Who it’s for</a><a className="nav-cta" href="/#start">Get help</a><button id="theme-toggle" className="theme-toggle" type="button" aria-pressed={theme === "dark"} onClick={toggleTheme}>Night mode</button></nav></div></header>
<main><section className="section"><div className="wrap">
<p className="eyebrow">BaraTrust Digital Reality Check</p>
<h1>Got it. Thank you.</h1>
<p className="section-intro">We’ll review your business and email you with next steps and the $49 payment link.</p>
<p className="section-intro">No payment has been collected. Your Reality Check starts after payment, and there’s no obligation to buy follow-up work.</p>
<div className="cta-row"><a className="btn primary" href="/">Back to BaraTrust</a></div>
</div></section></main><footer><div className="wrap footer-wrap"><div><strong>BaraTrust</strong><p>Practical digital help for small businesses.</p></div><div className="footer-links"><a href="mailto:todd@baratrust.com">todd@baratrust.com</a><span>© 2026 BaraTrust</span></div></div></footer>

    </div>
  );
}