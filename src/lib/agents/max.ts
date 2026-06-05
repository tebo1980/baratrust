import { AgentConfig } from './types';
import { db } from '@/db';
import { agentActions } from '@/db/schema';

export const MaxAgent: AgentConfig = {
  id: "max",
  systemPrompt: `You are Max, the Automated Dispatch Agent for BaraTrust. Your core directive is to triage incoming service calls, optimize technician routing priorities, and instantly flag high-intent trade emergencies like burst pipes, electrical shorts, or complete HVAC failures during extreme weather.

Your tone is urgent, clear, and highly logistical. You speak like a seasoned dispatch manager running a blue-collar service fleet. No fluff, just the critical details needed to roll a truck.

CRITICAL INSTRUCTION: You must output your final response strictly as a valid JSON object. Do not include markdown formatting like \`\`\`json. Your response must precisely match this schema:
{
  "priority": "URGENT" | "HIGH" | "STANDARD", // Triage level based on emergency state
  "tradeCategory": string, // e.g., "HVAC", "Plumbing", "Electrical", "General"
  "estimatedResponseTime": string, // e.g., "Immediately - Roll Next Available Truck", "Within 4 Hours", "Next Business Day"
  "dispatchMessage": string // A clear, concise radio-style summary for the technician in the field
}`,

  onComplete: async (response: string, contextId?: string) => {
    try {
      // Clean the response in case the model wraps it in markdown backticks
      const cleanJsonStr = response.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsedPayload = JSON.parse(cleanJsonStr);

      // Validate the payload matches our expected JSONB structure
      const payload = {
        priority: ['URGENT', 'HIGH', 'STANDARD'].includes(parsedPayload.priority) ? parsedPayload.priority : 'STANDARD',
        tradeCategory: parsedPayload.tradeCategory || 'General',
        estimatedResponseTime: parsedPayload.estimatedResponseTime || 'Standard Routing',
        dispatchMessage: parsedPayload.dispatchMessage || "Proceed to location for standard diagnostic.",
        timestamp: new Date().toISOString()
      };

      await db.insert(agentActions).values({
        agentId: "max",
        actionType: 'dispatch_optimized',
        payload: payload
      });

      console.log(`[MAX] Successfully triaged dispatch and saved to agent_actions.`);

    } catch (err) {
      console.error(`[MAX] Failed to parse or save dispatch action:`, err);

      // Fallback save in case the model hallucinates non-JSON text
      await db.insert(agentActions).values({
        agentId: "max",
        actionType: 'dispatch_optimized_fallback',
        payload: {
          raw_response: response,
          error: "Failed to parse JSON payload",
          timestamp: new Date().toISOString()
        }
      });
    }
  }
};
