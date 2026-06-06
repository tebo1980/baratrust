import { NextResponse } from "next/server";
import { AgentRegistry } from "@/lib/agents/index";

export const dynamic = "force-dynamic";

export async function GET() {
  const activeAgents = Object.keys(AgentRegistry).map(key => {
    const config = AgentRegistry[key];
    
    let displayRole = "Specialized Automation Engine";
    if (key === 'rex') displayRole = "Reputation & Review Manager";
    if (key === 'max') displayRole = "Automated Dispatch Agent";
    if (key === 'della') displayRole = "Lead Screener";
    if (key === 'nova') displayRole = "Lead Capture & Qualification";
    if (key === 'iris') displayRole = "7-Day Follow-up Sequencer";
    if (key === 'brix') displayRole = "Bidding & Estimate Architect";

    return {
      id: config.id,
      name: config.id.charAt(0).toUpperCase() + config.id.slice(1),
      role: displayRole
    };
  });

  return NextResponse.json({ agents: activeAgents });
}

