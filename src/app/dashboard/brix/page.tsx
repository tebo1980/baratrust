"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { saveProjectDetails, saveMessage, getProjectHistory } from "./actions";
import { useSearchParams, useRouter } from "next/navigation";

function BrixDashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [projectId, setProjectId] = useState<string | null>(searchParams.get("projectId"));
  
  const [jobName, setJobName] = useState("");
  const [address, setAddress] = useState("");
  
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "agent"; text: string }[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (!projectId) {
      const savedId = localStorage.getItem("lastBrixProject");
      if (savedId) {
        router.push(`?projectId=${savedId}`);
      }
    }
  }, [projectId, router]);

  useEffect(() => {
    if (projectId) {
      localStorage.setItem("lastBrixProject", projectId);
    }
  }, [projectId]);

  useEffect(() => {
    async function loadHistory() {
      // Only load history if the project is saved AND we haven't already started chatting
      // This prevents the UI from resetting to the bouncing dots when a user sends their first message
      if (projectId && messages.length === 0) {
        setIsLoadingHistory(true);
        const res = await getProjectHistory(projectId);
        if (res.success && res.project) {
          setJobName(res.project.name || "");
          setAddress(res.project.address || "");
          if (res.messages && res.messages.length > 0) {
            setMessages(
              res.messages.map((m) => ({
                role: m.role as "user" | "agent",
                text: m.content,
              }))
            );
          }
        }
        setIsLoadingHistory(false);
      }
    }
    loadHistory();
  }, [projectId]);

  const handleSaveProject = async () => {
    if (!jobName.trim()) return;
    
    setIsSaving(true);
    try {
      const res = await saveProjectDetails(jobName, address);
      if (res.success && res.id) {
        setProjectId(res.id);
        localStorage.setItem("lastBrixProject", res.id);
        router.push(`?projectId=${res.id}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearChat = async () => {
    // Instantly wipe the UI for a snappy feel
    setMessages([]);
    
    if (projectId) {
      try {
        // Asynchronously wipe the DB
        fetch("/api/chat/clear", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId }),
        });
        
        // We no longer reset project state here, allowing the user to restart the chat
        // for the EXACT same job/address without having to re-enter it.
      } catch (e) {
        console.error("Failed to clear chat", e);
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim().length === 0 || isTyping) return;

    // 1. Immediately toggle state and update UI for instantaneous feedback
    const userMsg = input;
    setInput("");
    setIsTyping(true);
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);

    try {
      let currentProjectId = projectId;

      // 2. Perform background DB tasks if needed
      if (!currentProjectId && jobName.trim()) {
        const saveRes = await saveProjectDetails(jobName, address);
        if (saveRes.success && saveRes.id) {
          currentProjectId = saveRes.id;
          setProjectId(currentProjectId);
          localStorage.setItem("lastBrixProject", currentProjectId);
          router.push(`?projectId=${currentProjectId}`);
        }
      }

      if (currentProjectId) {
        await saveMessage(currentProjectId, "user", userMsg);
      }

      const apiInput = jobName ? `Project: ${jobName} at ${address || "Unknown Address"}. User says: ${userMsg}` : userMsg;

      const res = await fetch("/api/agent-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent: "brix", input: apiInput }),
      });

      const data = await res.json();

      if (data.response) {
        setMessages((prev) => [...prev, { role: "agent", text: data.response }]);
        if (currentProjectId) {
          await saveMessage(currentProjectId, "assistant", data.response);
        }
      } else {
        setMessages((prev) => [...prev, { role: "agent", text: "Error: Could not reach the agent." }]);
      }
    } catch (error) {
      setMessages((prev) => [...prev, { role: "agent", text: "Network error. Is the server running?" }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-950 text-white font-sans overflow-hidden">
      {/* LEFT SIDEBAR - PROJECT DETAILS */}
      <aside className="w-80 bg-gray-900 border-r border-gray-800 flex flex-col shadow-2xl relative z-10">
        <div className="p-6 border-b border-gray-800 bg-gray-900/80 backdrop-blur-md">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(59,127,212,0.4)]">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M2 22h20"/><path d="M12 2v20"/><path d="M5 10h14"/><path d="M5 15h14"/></svg>
            </div>
            <h1 className="text-2xl font-bold tracking-widest text-blue-500">BARATRUST</h1>
          </div>
          <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-semibold ml-11">Brix Bidding Engine</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                <h2 className="text-lg font-semibold text-white">Project Details</h2>
              </div>
              {projectId && (
                <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded border border-green-500/30">Saved</span>
              )}
            </div>
            
            <div className="space-y-5">
              <div className="group">
                <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider group-focus-within:text-blue-400 transition-colors">Job Name</label>
                <input
                  type="text"
                  value={jobName}
                  onChange={(e) => setJobName(e.target.value)}
                  placeholder="e.g. Smith Residence Roof"
                  className="w-full bg-gray-950/50 border border-gray-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-gray-600"
                />
              </div>

              <div className="group">
                <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider group-focus-within:text-blue-400 transition-colors">Address</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 123 Main St..."
                  rows={3}
                  className="w-full bg-gray-950/50 border border-gray-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all resize-none placeholder:text-gray-600"
                />
              </div>

              <button
                type="button"
                onClick={handleSaveProject}
                disabled={jobName.trim().length === 0 || isSaving}
                className="w-full bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:hover:bg-gray-800 text-white text-sm font-semibold py-3 rounded-lg border border-gray-700 transition-colors"
              >
                {isSaving ? "Brix is calculating..." : projectId ? "Update Project" : "Save Project"}
              </button>
            </div>
          </div>
          
          <div className="p-5 bg-gradient-to-br from-blue-900/20 to-transparent border border-blue-500/20 rounded-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-2xl rounded-full -mr-10 -mt-10 pointer-events-none"></div>
            <h3 className="text-sm font-bold text-blue-400 mb-2 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
              Brix Intelligence
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Brix will help you generate a highly accurate, profitable bid by asking clarifying questions about the scope and structural details.
            </p>
          </div>
        </div>
      </aside>

      {/* CENTER CHAT INTERFACE */}
      <main className="flex-1 flex flex-col relative bg-[#0a0f18] before:absolute before:inset-0 before:bg-[url('data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjU2IDI1NiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuOSIgbnVtT2N0YXZlcz0iNCIgc3RpdGNoVGlsZXM9InN0aXRjaCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNub2lzZSkiIG9wYWNpdHk9IjAuMDIiLz48L3N2Zz4=')] before:pointer-events-none">
        
        {/* Header */}
        <header className="px-8 py-5 border-b border-gray-800/60 bg-gray-900/40 backdrop-blur-lg flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 flex items-center justify-center shadow-lg">
                <span className="text-xl">👷</span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gray-900 rounded-full flex items-center justify-center">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,127,212,0.8)]"></span>
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide">Brix</h2>
              <p className="text-xs text-blue-400 font-medium tracking-wide">Bidding & Estimate Architect</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <button 
               type="button"
               onClick={(e) => {
                 e.preventDefault();
                 handleClearChat();
               }}
               className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-md mr-4 flex items-center gap-2"
               title="Reset Brix's memory and start a new estimate"
             >
               <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
               Start New Estimate
             </button>
             <div className="text-xs font-semibold px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-2">
               <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
               System Online
             </div>
          </div>
        </header>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth z-0">
          {isLoadingHistory ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center animate-in fade-in duration-1000">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-900/30 to-gray-800/30 rounded-full flex items-center justify-center mb-6 border border-blue-500/20 shadow-[0_0_40px_rgba(59,127,212,0.1)]">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Initialize Protocol with Brix</h3>
              <p className="text-gray-400 max-w-md">
                Describe the job details or provide initial scope to start the bidding process. Brix will guide you to a profitable estimate.
              </p>
            </div>
          ) : (
            <div className="space-y-6 max-w-4xl mx-auto">
              {messages.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in slide-in-from-bottom-2 fade-in duration-300`}>
                  <div 
                    className={`max-w-[80%] p-5 text-[15px] leading-relaxed shadow-lg ${
                      msg.role === "user" 
                        ? "bg-blue-600 text-white rounded-2xl rounded-br-sm shadow-blue-900/20" 
                        : "bg-gray-800/80 backdrop-blur-sm text-gray-200 border border-gray-700/50 rounded-2xl rounded-bl-sm"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start animate-in fade-in duration-200">
                  <div className="flex items-center text-xs text-amber-400 bg-black/40 border border-amber-500/30 px-4 py-2 rounded-md animate-pulse w-fit mt-4 shadow-lg shadow-amber-900/20">
                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-amber-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Brix is calculating labor and scanning regional grant databases...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-6 bg-gray-900/80 backdrop-blur-md border-t border-gray-800/60 z-10">
          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative group">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isTyping}
              placeholder="Detail the scope or answer Brix's questions..."
              className="w-full bg-gray-950/80 border border-gray-700 rounded-xl pl-6 pr-32 py-4 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-gray-500 shadow-inner text-[15px] disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={input.trim().length === 0 || isTyping}
              className="absolute right-2 top-2 bottom-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 px-6 rounded-lg font-semibold transition-all flex items-center gap-2 text-white shadow-[0_0_15px_rgba(59,127,212,0.3)] disabled:shadow-none"
            >
              {isTyping ? "Brix is calculating..." : (
                <>
                  Send
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </>
              )}
            </button>
          </form>
          <div className="text-center mt-3 text-xs text-gray-500 font-medium">
            Press <kbd className="font-mono bg-gray-800 px-1 py-0.5 rounded border border-gray-700 text-gray-400">Enter</kbd> to send. Brix is an AI bidding assistant and may require verification.
          </div>
        </div>
      </main>
    </div>
  );
}

export default function BrixDashboard() {
  return (
    <Suspense fallback={<div className="h-screen bg-gray-950 flex items-center justify-center text-white">Loading Brix...</div>}>
      <BrixDashboardContent />
    </Suspense>
  );
}
