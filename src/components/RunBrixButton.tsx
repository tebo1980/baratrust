"use client";

import { useState } from "react";

export default function RunBrixButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleRunBrix = async () => {
    setIsLoading(true);
    try {
      const inputStr = "Generate a full estimate for a 3 ton ac_and_furnace replacement in Louisville, KY.";
      const res = await fetch("/api/agent-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent: "brix", input: inputStr }),
      });

      const data = await res.json();
      console.log("Brix Output:", data.response);
      alert("Brix completed the quote! Open the browser developer console to read the full output.");
    } catch (err) {
      console.error(err);
      alert("Failed to execute Brix protocol. Check the console for details.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleRunBrix}
      disabled={isLoading}
      className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] hover:border-cyan-500/60"
    >
      {isLoading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Brix is calculating...
        </>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          Test Brix Agent
        </>
      )}
    </button>
  );
}
