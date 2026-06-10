"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

interface UIAgent {
  id: string;
  name: string;
  role: string;
  status?: 'active' | 'standby';
}

const MASTER_FLEET_BLUEPRINT: UIAgent[] = [
  { id: "nova", name: "Nova", role: "Lead Capture & Qualification", status: "active" },
  { id: "rex", name: "Rex", role: "Reputation & Review Manager", status: "active" },
  { id: "iris", name: "Iris", role: "7-Day Follow-up Sequencer", status: "active" },
  { id: "max", name: "Max", role: "Automated Dispatch Agent", status: "active" },
  { id: "della", name: "Della", role: "Lead Screener", status: "active" },
  { id: "brix", name: "Brix", role: "Bidding & Estimate Architect", status: "active" },
  { id: "gemma", name: "Gemma", role: "Automated Supply Chain & Parts Procurement", status: "active" },
  { id: "fetch", name: "Fetch", role: "Autonomous Scouting Agent", status: "active" },
  { id: "sage", name: "Sage", role: "Social Media Drafter", status: "standby" },
  { id: "flynn", name: "Flynn", role: "Fleet & Mileage Tracker", status: "standby" },
  { id: "cole", name: "Cole", role: "COGS & Inventory Analyst", status: "standby" },
  { id: "river", name: "River", role: "Schedule & No-Show Preventer", status: "standby" },
  { id: "bolt", name: "Bolt", role: "Restaurant & Menu Analyst", status: "standby" },
  { id: "shield", name: "Shield", role: "Insurance & Liability Educator", status: "standby" },
  { id: "atlas", name: "Atlas", role: "Stripe & Financial Gateway", status: "standby" },
  { id: "scout", name: "Scout", role: "Material Procurement", status: "standby" },
  { id: "acoustic", name: "Acoustic", role: "Royalty-Free BGM System", status: "standby" },
  { id: "blackbox", name: "Black Box", role: "Forensic Dispute Resolver", status: "standby" },
  { id: "rescue", name: "ShiftRescue", role: "Emergency Staffing", status: "standby" },
];

export default function CommandCenter() {
  const [agents, setAgents] = useState<UIAgent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<UIAgent | null>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "agent"; text: string }[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    async function loadAgents() {
      try {
        const res = await fetch('/api/agents');
        const data = await res.json();

        // Merge DB/API active agents with the Master Blueprint
        const mergedFleet = MASTER_FLEET_BLUEPRINT.map(blueprintAgent => {
          const apiAgent = data.agents?.find((a: any) => a.id === blueprintAgent.id);
          if (apiAgent) {
             return { ...blueprintAgent, name: apiAgent.name, role: apiAgent.role, status: 'active' as const };
          }
          return blueprintAgent;
        });

        setAgents(mergedFleet);
        setSelectedAgent(mergedFleet[0]); // Hard fallback to first engine
      } catch (err) {
        console.error("Failed to load agent registry:", err);
        // Fallback to purely local blueprint on failure
        setAgents(MASTER_FLEET_BLUEPRINT);
        setSelectedAgent(MASTER_FLEET_BLUEPRINT[0]);
      }
    }
    loadAgents();
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim().length === 0 || isTyping || !selectedAgent) return;

    const userMsg = input;
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setInput("");
    setIsTyping(true);

    try {
      const res = await fetch("/api/agent-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent: selectedAgent.id, input: userMsg }),
      });

      const data = await res.json();

      if (data.response) {
        setMessages((prev) => [...prev, { role: "agent", text: data.response }]);
      } else {
        setMessages((prev) => [...prev, { role: "agent", text: "Error: Could not reach the agent." }]);
      }
    } catch (error) {
      setMessages((prev) => [...prev, { role: "agent", text: "Network error. Is the server running?" }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleAgentSwitch = (agent: UIAgent) => {
    setSelectedAgent(agent);
    setMessages([]);
  };

  if (!selectedAgent) {
    return <div className="flex h-[calc(100vh-64px)] bg-[#050810] items-center justify-center text-[#C17B2A] font-semibold tracking-wider animate-pulse">Synchronizing Agent Registry...</div>;
  }

  return (
    <div className="flex h-[calc(100vh-64px)] w-full bg-[#050810] text-slate-200 overflow-hidden font-sans">
      <aside className="w-80 bg-[#1E1B16] border-r border-[#2A2621] flex flex-col">
        <div className="p-6 border-b border-[#2A2621]">
          <h1 className="text-2xl font-bold tracking-widest text-[#C17B2A]">ADMIN HUB</h1>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider">Fleet Registry v2.0</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {agents.map((agent) => {
            const isLinkable = agent.id === "brix" || agent.id === "fetch" || agent.id === "nova" || agent.id === "rex" || agent.id === "max" || agent.id === "della" || agent.id === "iris" || agent.id === "gemma";

            // Generate routing paths based on isolated layout definitions
            const agentPath = (() => {
               if (agent.id === 'fetch') return "/pioneer";
               if (agent.id === 'nova') return "/internal/opportunitywatch-v2";
               return `/dashboard/${agent.id}`;
            })();

            const isActive = pathname === agentPath || (pathname === "/" && selectedAgent.id === agent.id);

            const isStandby = agent.status === 'standby';

            const className = `w-full text-left p-3 rounded-lg transition-all duration-200 block border ${isActive
              ? "bg-[#C17B2A]/10 border-[#C17B2A]/50 text-[#C17B2A] shadow-[0_0_10px_rgba(193,123,42,0.1)]"
              : isStandby
                ? "bg-transparent border-amber-900/30 text-amber-600/70 hover:bg-amber-900/10 cursor-pointer"
                : "bg-transparent border-transparent hover:bg-slate-800/50 text-slate-400 hover:text-slate-200"
              }`;

            return (
              <button
                key={agent.id}
                onClick={() => {
                  if (isStandby) {
                    handleAgentSwitch(agent);
                  } else if (isLinkable) {
                    router.push(agentPath);
                  } else {
                    handleAgentSwitch(agent);
                  }
                }}
                className={className}
              >
                <div className="flex justify-between items-center">
                  <div className="font-semibold text-sm">{agent.name ?? 'Unknown Agent'}</div>
                  {isStandby && <span className="text-[9px] uppercase font-bold tracking-widest px-1.5 py-0.5 border border-amber-800/50 bg-amber-900/20 text-amber-500 rounded">Standby</span>}
                </div>
                <div className="text-xs opacity-70 truncate mt-1">{agent.role ?? 'System Agent'}</div>
              </button>
            );
          })}
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative">
        <header className="p-6 border-b border-[#2A2621] bg-[#1A1713]/50 backdrop-blur-sm flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {selectedAgent.name ?? 'Unknown Agent'}
            </h2>
            <p className="text-sm text-slate-400">{selectedAgent.role ?? 'System Agent'}</p>
          </div>
          {selectedAgent.id === "atlas" && (
            <a href="/api/atlas-gateway" className="text-xs bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded border border-slate-700 text-slate-300 transition-colors">
              View Payment Gateway
            </a>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {selectedAgent.status === 'standby' ? (
            <div className="h-full flex flex-col items-center justify-center text-amber-500/70 border-2 border-dashed border-amber-900/30 rounded-xl p-8 m-6 text-center">
              <div className="w-12 h-12 rounded-full bg-amber-900/20 flex items-center justify-center mb-4">
                 <span className="w-3 h-3 rounded-full bg-amber-500 animate-pulse"></span>
              </div>
              <h3 className="text-lg font-bold tracking-wider mb-2">Protocol on Standby</h3>
              <p className="text-sm font-medium">Core engine initialization scheduled.</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500">
              <p>Initialize protocol with {selectedAgent.name ?? 'Agent'}...</p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[70%] p-4 rounded-xl shadow-md ${msg.role === "user"
                    ? "bg-[#C17B2A] text-[#050810] rounded-br-none font-medium"
                    : "bg-[#1E1B16] text-slate-200 border border-[#2A2621] rounded-bl-none"
                    }`}
                >
                  {msg.text}
                </div>
              </div>
            ))
          )}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-[#1E1B16] text-slate-400 border border-[#2A2621] p-4 rounded-xl rounded-bl-none flex gap-2 items-center shadow-md">
                <span className="w-2 h-2 bg-[#C17B2A] rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-[#C17B2A] rounded-full animate-bounce delay-75"></span>
                <span className="w-2 h-2 bg-[#C17B2A] rounded-full animate-bounce delay-150"></span>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-[#0B0F19] border-t border-[#2A2621]">
          <form onSubmit={handleSendMessage} className="flex gap-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={selectedAgent.status === 'standby'}
              placeholder={selectedAgent.status === 'standby' ? "Secure transmission channel locked." : `Send a directive to ${selectedAgent.name ?? 'Agent'}...`}
              className="flex-1 bg-[#1A1713] border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-[#C17B2A]/50 focus:ring-1 focus:ring-[#C17B2A]/50 transition-all placeholder:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={input.trim().length === 0 || isTyping || !selectedAgent || selectedAgent.status === 'standby'}
              className="bg-[#C17B2A] hover:bg-[#A66721] disabled:opacity-50 disabled:hover:bg-[#C17B2A] text-[#050810] px-8 py-3 rounded-lg font-bold tracking-wider uppercase transition-all shadow-[0_0_15px_rgba(193,123,42,0.3)] disabled:shadow-none disabled:cursor-not-allowed"
            >
              Send
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}