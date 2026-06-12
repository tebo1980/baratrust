"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Bot, Activity, Database, Zap, ShieldCheck } from "lucide-react";
import { useState, useEffect } from "react";

interface UIAgent {
  id: string;
  name: string;
  role: string;
}

const CapybaraLogo = () => (
  <svg className="w-10 h-10 hover:scale-105 transition-transform" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M25 40 Q25 20 50 20 Q80 20 85 45 Q90 60 85 75 Q80 90 60 90 L30 90 Q15 90 15 75 L15 55 Q15 40 25 40 Z" fill="#D97706" />
    <path d="M85 45 Q95 45 95 60 Q95 70 85 75 Z" fill="#B45309" />
    <rect x="10" y="38" width="85" height="14" rx="2" fill="#09090B" />
    <path d="M20 52 L40 52 L35 65 L25 65 Z" fill="#09090B" />
    <path d="M55 52 L75 52 L70 65 L60 65 Z" fill="#09090B" />
    <line x1="22" y1="42" x2="38" y2="42" stroke="white" strokeOpacity="0.3" strokeWidth="2" strokeLinecap="round" />
    <line x1="57" y1="42" x2="73" y2="42" stroke="white" strokeOpacity="0.3" strokeWidth="2" strokeLinecap="round" />
    <circle cx="90" cy="55" r="2.5" fill="#451A03" />
  </svg>
);

export default function MasterDashboard() {
  const [agents, setAgents] = useState<UIAgent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAgents() {
      try {
        const res = await fetch('/api/agents');
        const data = await res.json();
        if (data.agents) {
          setAgents(data.agents);
        }
      } catch (err) {
        console.error("Failed to load agent registry:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAgents();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-zinc-100 selection:bg-amber-500/30">

      <header className="h-[88px] border-b border-zinc-800/50 flex items-center justify-between px-10 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-4 group">
            <div className="relative">
              <div className="absolute inset-0 bg-amber-500/20 blur-lg rounded-full group-hover:bg-amber-500/40 transition-colors" />
              <CapybaraLogo />
            </div>
            <span className="text-xl font-bold tracking-wider text-zinc-100 uppercase font-mono hidden sm:block">
              BaraTrust <span className="text-amber-500">Suite</span>
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <div className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center gap-3">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-mono text-zinc-400">SYSTEM NOMINAL</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-10 mt-8">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-zinc-100 tracking-tight mb-3">Command Center</h1>
          <p className="text-zinc-500 font-mono text-sm uppercase tracking-widest">Select an active agent protocol to begin</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-zinc-500 font-mono animate-pulse">Initializing Agent Grid...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {agents.map((agent) => {
              const agentPath = (() => {
                if (agent.id === 'fetch') return '/pioneer';
                if (agent.id === 'brix') return '/dashboard/brix';
                if (agent.id === 'nova') return '/internal/opportunitywatch-v2';
                return `/agents?agent=${agent.id}`;
              })();

              const isFetch = agent.id === 'fetch';
              const Icon = isFetch ? Activity : Bot;
              const colorTheme = isFetch ? "amber" : "blue";

              return (
                <Link key={agent.id} href={agentPath}>
                  <motion.div whileHover={{ y: -5 }} className={`group relative bg-zinc-900 rounded-2xl p-8 border border-zinc-800 overflow-hidden hover:border-${colorTheme}-500/50 hover:shadow-[0_0_30px_rgba(59,130,246,0.1)] transition-all h-full flex flex-col`}>
                    <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-${colorTheme}-500/10 to-transparent blur-3xl rounded-full group-hover:from-${colorTheme}-500/20 transition-colors`} />

                    <div className="flex justify-between items-start mb-8 relative">
                      <div className={`w-14 h-14 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-center text-${colorTheme}-500 group-hover:scale-110 transition-transform`}>
                        <Icon className="w-7 h-7" />
                      </div>
                      <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold uppercase tracking-widest rounded-full">
                        Online
                      </span>
                    </div>

                    <h2 className="text-2xl font-bold text-zinc-100 mb-2">{agent.name}</h2>
                    <p className="text-zinc-400 text-sm leading-relaxed mb-8 flex-1">
                      {agent.role}
                    </p>

                    <div className={`flex items-center text-${colorTheme}-500 font-mono text-xs uppercase tracking-widest font-bold group-hover:gap-3 transition-all gap-2`}>
                      Launch {agent.name} <ArrowRight className="w-4 h-4" />
                    </div>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        )}

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 border-t border-zinc-800/50 pt-8">
          <div className="flex items-center gap-4 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50">
            <Database className="w-5 h-5 text-zinc-500" />
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono font-bold mb-1">Primary DB</p>
              <p className="text-sm text-zinc-300 font-mono">Neon Postgres</p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50">
            <Zap className="w-5 h-5 text-amber-500" />
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono font-bold mb-1">Compute</p>
              <p className="text-sm text-zinc-300 font-mono">Vercel Edge</p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50">
            <ShieldCheck className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono font-bold mb-1">Auth Layer</p>
              <p className="text-sm text-zinc-300 font-mono">Firebase Secure</p>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}