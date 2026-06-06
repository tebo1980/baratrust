import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { AgentRegistry } from "@/lib/agents";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { agent, input } = await req.json();

    if (!agent || !input) {
      return NextResponse.json({ error: "Missing agent or input" }, { status: 400 });
    }

    const agentKey = agent.toLowerCase();
    const agentConfig = AgentRegistry[agentKey];

    if (!agentConfig) {
      return NextResponse.json({ error: "Unknown agent" }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    const modelName = "gemini-2.5-flash";

    // 1. Dynamic Initialization
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: agentConfig.systemPrompt,
      tools: agentConfig.tools,
    });

    const chat = model.startChat({
      generationConfig: { maxOutputTokens: 8192, temperature: 0.7 }
    });

    let result = await chat.sendMessage([{ text: input }]);
    let finalResponse = "";
    let stepCount = 0;

    // 2. Dynamic Tool Execution Loop
    while (stepCount < 5) {
      try {
        const chunkText = result.response.text();
        if (chunkText) finalResponse += chunkText + "\n";
      } catch (e) {}

      const calls = result.response.functionCalls();
      if (!calls || calls.length === 0) break;

      stepCount++;
      const call = calls[0];

      if (agentConfig.executeTool) {
        try {
          const toolResponse = await agentConfig.executeTool(call.name, call.args);

          result = await chat.sendMessage([{
            functionResponse: { name: call.name, response: toolResponse }
          }]);
        } catch (toolErr: any) {
          console.error("Function execution failed:", toolErr);
          break;
        }
      } else {
        console.error(`Tool call ${call.name} intercepted, but agent ${agentKey} has no executeTool defined.`);
        break;
      }
    }

    // 3. Dynamic Post-Completion Hooks
    if (!finalResponse.trim()) {
      finalResponse = "Agent logic executed successfully, but no final summary was generated.";
    }

    if (agentConfig.onComplete) {
      await agentConfig.onComplete(finalResponse);
    }

    return NextResponse.json({ response: finalResponse.trim() });

  } catch (err: any) {
    console.error("Agent live error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}