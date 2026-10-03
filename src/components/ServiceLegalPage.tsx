"use client";
import { useEffect, useState, type ReactNode } from "react";
import "../app/landing.css";
import "./service-legal.css";

export default function ServiceLegalPage({title,children}:{title:string;children:ReactNode}) {
  const [theme,setTheme]=useState("light");
  useEffect(()=>{
    const media=window.matchMedia("(prefers-color-scheme: dark)");
    const update=()=>{let saved=null;try{saved=localStorage.getItem("baratrust-theme");}catch{}
      setTheme(saved==="light"||saved==="dark"?saved:media.matches?"dark":"light");};
    update();media.addEventListener("change",update);return ()=>media.removeEventListener("change",update);
  },[]);
  const toggle=()=>{const next=theme==="dark"?"light":"dark";setTheme(next);try{localStorage.setItem("baratrust-theme",next);}catch{}};
  return <div className="landing-wrapper bt-legal" data-theme={theme}><div className="wrap">
    <header className="bt-legal-header"><a href="/">BaraTrust</a><button type="button" className="theme-toggle" aria-label="Night mode" aria-pressed={theme==="dark"} onClick={toggle}>{theme==="dark"?"Day mode":"Night mode"}</button></header>
    <main className="bt-legal-body"><h1>{title}</h1>{children}</main>
    <footer className="bt-legal-footer"><a href="/">Home</a><a href="/service-terms">Service Terms</a><a href="/privacy">Privacy</a><a href="mailto:todd@baratrust.com">todd@baratrust.com</a></footer>
  </div></div>;
}
