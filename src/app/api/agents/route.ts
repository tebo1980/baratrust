import { NextResponse } from "next/server";
import { AgentRegistry } from "@/lib/agents";

export async function GET() {
  // Map the registry object into an array for the UI
  const activeAgents = Object.keys(AgentRegistry).map(key => {
    const config = AgentRegistry[key];

    // Parse or assign roles for production polish
    let displayRole = "Specialized Automation Engine";
    if (key === 'rex') displayRole = "Reputation & Review Manager";
    if (key === 'max') displayRole = "Automated Dispatch Agent";
    if (key === 'della') displayRole = "Lead Screener";

    return {
      id: config.id,
      name: config.id.charAt(0).toUpperCase() + config.id.slice(1),
      role: displayRole
    };
  });

  return NextResponse.json({ agents: activeAgents });
}
