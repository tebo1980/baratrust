import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { AgentRegistry } from "@/lib/agents";

// Increase max duration to prevent Vercel from violently severing the connection during long DB writes
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    // 1. Robust Payload Parsing
    // The frontend sends { agent: string, input: string }
    const payload = await req.json();
    const agentId = payload.agent || payload.agentId; // Catch both variations just in case
    const input = payload.input;

    if (!agentId || !input) {
      console.error("[ORCHESTRATOR] Malformed Payload:", payload);
      return NextResponse.json({ error: "Missing agent identifier or input" }, { status: 400 });
    }

    const agentKey = agentId.toLowerCase();
    const agentConfig = AgentRegistry[agentKey];

    if (!agentConfig) {
      console.error(`[ORCHESTRATOR] Unregistered agent requested: ${agentKey}`);
      return NextResponse.json({ error: "Unknown agent" }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error("[ORCHESTRATOR] Missing GEMINI_API_KEY environment variable");
      return NextResponse.json({ error: "System Configuration Error" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const modelName = "gemini-2.5-flash";
    
    // 2. Dynamic Initialization
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: agentConfig.systemPrompt,
      tools: agentConfig.tools,
    });

    const chat = model.startChat({
      generationConfig: { maxOutputTokens: 8192, temperature: 0.7 }
    });

    console.log(`[ORCHESTRATOR] Booting protocol for agent: ${agentConfig.id || agentKey}`);

    let result = await chat.sendMessage([{ text: input }]);
    let finalResponse = "";
    let stepCount = 0;

    // 3. Tool Execution Loop (Graceful Streaming Fallback)
    while (stepCount < 5) {
      try {
        const chunkText = result.response.text();
        if (chunkText) finalResponse += chunkText + "\n";
      } catch (e) {
        console.warn("[ORCHESTRATOR] Text extraction warning:", e);
      }

      const calls = result.response.functionCalls();
      if (!calls || calls.length === 0) break;

      stepCount++;
      const call = calls[0];

      if (agentConfig.executeTool) {
        try {
          console.log(`[ORCHESTRATOR] Executing tool ${call.name} for agent ${agentKey}`);
          const toolResponse = await agentConfig.executeTool(call.name, call.args);

          result = await chat.sendMessage([{
            functionResponse: { name: call.name, response: toolResponse }
          }]);
        } catch (toolErr: any) {
          console.error(`[ORCHESTRATOR] Tool execution failed (${call.name}):`, toolErr);
          break;
        }
      } else {
        console.error(`[ORCHESTRATOR] Tool call ${call.name} intercepted, but agent ${agentKey} has no executeTool defined.`);
        break;
      }
    }

    if (!finalResponse.trim()) {
      finalResponse = "Agent logic executed successfully, but no final summary was generated.";
    }

    // 4. Fully Awaited Database Commit Block
    // We EXPLICITLY await this hook before returning NextResponse so the serverless 
    // container does not terminate the Neon Postgres connection prematurely.
    if (agentConfig.onComplete) {
      try {
        console.log(`[ORCHESTRATOR] Locking in database writes via onComplete for ${agentKey}...`);
        await agentConfig.onComplete(finalResponse);
        console.log(`[ORCHESTRATOR] Database writes confirmed.`);
      } catch (dbErr: any) {
        console.error(`[ORCHESTRATOR] FATAL: Database commit failed during onComplete:`, dbErr);
        // We do NOT throw here so the user still gets their response, 
        // but we log it aggressively for debugging.
      }
    }

    // 5. Graceful finalization
    return NextResponse.json({ response: finalResponse.trim() });

  } catch (err: any) {
    console.error("[ORCHESTRATOR] Live execution error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}