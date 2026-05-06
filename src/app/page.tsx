"use client";

import { useState } from "react";

// The full roster of BaraTrust Agents
const AGENTS = [
  { id: "nova", name: "Nova", role: "Lead Capture & Qualification" },
  { id: "rex", name: "Rex", role: "Reputation & Review Manager" },
  { id: "iris", name: "Iris", role: "7-Day Follow-up Sequencer" },
  { id: "max", name: "Max", role: "Post-Job & Payment Automator" },
  { id: "della", name: "Della", role: "Client Communications Secretary" },
  { id: "sage", name: "Sage", role: "Social Media Drafter" },
  { id: "flynn", name: "Flynn", role: "Fleet & Mileage Tracker" },
  { id: "cole", name: "Cole", role: "COGS & Inventory Analyst" },
  { id: "river", name: "River", role: "Schedule & No-Show Preventer" },
  { id: "bolt", name: "Bolt", role: "Restaurant & Menu Analyst" },
  { id: "brix", name: "Brix", role: "Bidding & Estimate Architect" },
  { id: "shield", name: "Shield", role: "Insurance & Liability Educator" },
  { id: "atlas", name: "Atlas", role: "Stripe & Financial Gateway" },
  { id: "scout", name: "Scout", role: "Material Procurement" },
  { id: "acoustic", name: "Acoustic", role: "Royalty-Free BGM System" },
  { id: "blackbox", name: "Black Box", role: "Forensic Dispute Resolver" },
  { id: "rescue", name: "ShiftRescue", role: "Emergency Staffing" },
];

export default function CommandCenter() {
  const [selectedAgent, setSelectedAgent] = useState(AGENTS[0]);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "agent"; text: string }[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

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
  const handleAgentSwitch = (agent: typeof AGENTS[0]) => {
    setSelectedAgent(agent);
    setMessages([]);
  };

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className="w-80 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-2xl font-bold tracking-widest text-blue-500">BARATRUST</h1>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider">Command Center v2.0</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {AGENTS.map((agent) => (
            <button
              key={agent.id}
              onClick={() => handleAgentSwitch(agent)}
              className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                selectedAgent.id === agent.id
                  ? "bg-blue-600/20 border border-blue-500/50 text-blue-400"
                  : "bg-transparent border border-transparent hover:bg-gray-800 text-gray-400 hover:text-gray-200"
              }`}
            >
              <div className="font-semibold text-sm">{agent.name}</div>
              <div className="text-xs opacity-70 truncate mt-1">{agent.role}</div>
            </button>
          ))}
        </div>
      </aside>

      {/* MAIN CHAT AREA */}
      <main className="flex-1 flex flex-col relative">
        {/* Header */}
        <header className="p-6 border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              {selectedAgent.name}
            </h2>
            <p className="text-sm text-gray-400">{selectedAgent.role}</p>
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
                  className={`max-w-[70%] p-4 rounded-xl ${
                    msg.role === "user" 
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
              disabled={!input.trim() || isTyping}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 px-6 py-3 rounded-lg font-semibold transition-all"
            >
              Send
            </button>
          </form>
        </div>
      </main>

    </div>
  );
}