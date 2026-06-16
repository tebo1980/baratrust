import { NextResponse } from "next/server";
import { AgentRegistry } from "@/lib/agents/index";
import { db } from "@/db";
import { agentConfigs } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Live Database Sourcing (Neon Postgres via Drizzle)
    let dbAgents: any[] | undefined;
    try {
      dbAgents = await db.select().from(agentConfigs);
    } catch (e) {
      console.error("Agent Registry DB fallback triggered:", e);
      dbAgents = [];
    }

    if (dbAgents && dbAgents.length > 0) {
      const activeAgents = dbAgents.map(record => ({
        id: record.agentName.toLowerCase().replace(/ /g, '_'),
        name: record.agentName,
        role: "Operational Engine", // Database fallback role
        isActive: record.isActive === 'true'
      }));
      return NextResponse.json({ agents: activeAgents });
    }
    
    // 2. Hybrid Fallback Architecture (Static Registry)
    const activeAgents = Object.keys(AgentRegistry).map(key => {
      const config = AgentRegistry[key];
      
      let displayRole = "Specialized Automation Engine";
      if (key === 'rex') displayRole = "Reputation & Review Manager";
      if (key === 'max') displayRole = "Automated Dispatch Agent";
      if (key === 'della') displayRole = "Lead Screener";
      if (key === 'nova') displayRole = "Lead Capture & Qualification";
      if (key === 'iris') displayRole = "7-Day Follow-up Sequencer";
      if (key === 'brix') displayRole = "Bidding & Estimate Architect";
      if (key === 'gemma') displayRole = "Automated Supply Chain & Parts Procurement";

      return {
        id: config.id,
        name: config.id.charAt(0).toUpperCase() + config.id.slice(1),
        role: displayRole
      };
    });

    return NextResponse.json({ agents: activeAgents });
  } catch (error) {
    console.error("Agent Registry Fetch Error:", error);
    return NextResponse.json({ error: "Failed to fetch agents" }, { status: 500 });
  }
}

