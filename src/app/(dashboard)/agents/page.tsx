"use client";

import { useState, useEffect, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface UIAgent {
  id: string;
  name: string;
  role: string;
}

function CommandCenterContent() {
  const [agents, setAgents] = useState<UIAgent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<UIAgent | null>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "agent"; text: string }[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const searchParams = useSearchParams();
  const requestedAgentId = searchParams.get("agent");

  // 1. Dynamically fetch the live agents from the registry on mount
  useEffect(() => {
    async function loadAgents() {
      try {
        const res = await fetch('/api/agents');
        const data = await res.json();

        if (data.agents && data.agents.length > 0) {
          setAgents(data.agents);

          // Try to find the requested agent via query param, otherwise fallback to the first engine
          const targetAgent = data.agents.find((a: UIAgent) => a.id === requestedAgentId);
          setSelectedAgent(targetAgent || data.agents[0]);
        }
      } catch (err) {
        console.error("Failed to load agent registry:", err);
      }
    }
    loadAgents();
  }, [requestedAgentId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim().length === 0 || isTyping || !selectedAgent) return;

    // Add user message to UI
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

  // When switching agents, clear the chat history
  const handleAgentSwitch = (agent: UIAgent) => {
    setSelectedAgent(agent);
    setMessages([]);
  };

  if (!selectedAgent) {
    return <div className="flex h-screen bg-gray-950 items-center justify-center text-white">Loading Agent Registry...</div>;
  }

  return (
    <div className="flex h-[calc(100vh-64px)] w-full bg-gray-950 text-white overflow-hidden">

      {/* SPLIT VIEW LAYOUT */}

      {/* LEFT PANEL: Chat Interface */}
      <main className="flex-1 flex flex-col relative border-r border-gray-800">
        {/* Header */}
        <header className="p-6 border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              {selectedAgent.name} // Console
            </h2>
            <p className="text-sm text-gray-400">Secure transmission channel open.</p>
          </div>
          {/* Easter egg back to our Stripe test */}
          {selectedAgent.id === "atlas" && (
            <a href="/api/atlas-gateway" className="text-xs bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded border border-gray-700 text-gray-300">
              View Payment Gateway
            </a>
          )}
        </header>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500">
              <p>Initialize protocol with {selectedAgent.name}...</p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[70%] p-4 rounded-xl ${msg.role === "user"
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-gray-800 text-gray-200 border border-gray-700 rounded-bl-none"
                    }`}
                >
                  {msg.text}
                </div>
              </div>
            ))
          )}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-800 text-gray-400 border border-gray-700 p-4 rounded-xl rounded-bl-none flex gap-2 items-center">
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-75"></span>
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-150"></span>
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-6 bg-gray-900 border-t border-gray-800">
          <form onSubmit={handleSendMessage} className="flex gap-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Send a directive to ${selectedAgent.name}...`}
              className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
            <button
              type="submit"
              disabled={input.trim().length === 0 || isTyping}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 px-6 py-3 rounded-lg font-semibold transition-all"
            >
              Send
            </button>
          </form>
        </div>
      </main>

      {/* RIGHT PANEL: Agent Status Panel */}
      <aside className="w-96 bg-gray-900 flex flex-col p-8 space-y-8">
        <div>
          <h3 className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2">Active Protocol</h3>
          <h1 className="text-3xl font-bold text-white mb-1">{selectedAgent.name}</h1>
          <p className="text-blue-400 font-medium">{selectedAgent.role}</p>
        </div>

        <div className="bg-gray-950 border border-gray-800 rounded-xl p-5 shadow-inner">
          <h4 className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-3 border-b border-gray-800 pb-2">Operational Directive</h4>
          <p className="text-sm text-gray-400 leading-relaxed">
            {selectedAgent.name} is configured to manage operations related to {selectedAgent.role.toLowerCase()}.
            All output is strictly verified via JSON schema parsing before being committed to the centralized database ledger.
          </p>
        </div>

        <div className="bg-gray-950 border border-gray-800 rounded-xl p-5 shadow-inner">
          <h4 className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-3 border-b border-gray-800 pb-2">System Status</h4>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Database Connection</span>
              <span className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Secure
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Memory Bank Sync</span>
              <span className="text-sm font-semibold text-blue-400">Active</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Last Action</span>
              <span className="text-sm font-semibold text-gray-300">Just now</span>
            </div>
          </div>
        </div>
      </aside>

    </div>
  );
}

export default function CommandCenter() {
  return (
    <Suspense fallback={<div className="flex h-screen bg-gray-950 items-center justify-center text-white">Loading Command Center...</div>}>
      <CommandCenterContent />
    </Suspense>
  );
}