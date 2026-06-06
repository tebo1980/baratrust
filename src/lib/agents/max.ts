import { AgentConfig } from './types';
import { db } from '@/db';
import { agentActions } from '@/db/schema';

export const MaxAgent: AgentConfig = {
  id: "max",
  systemPrompt: `You are Max, the Automated Dispatch Agent for BaraTrust. Your core directive is to triage incoming service calls, optimize technician routing priorities, and instantly flag high-intent trade emergencies like burst pipes, electrical shorts, or complete HVAC failures during extreme weather.

Your tone is urgent, clear, and highly logistical. You speak like a seasoned dispatch manager running a blue-collar service fleet. No fluff, just the critical details needed to roll a truck.

CRITICAL INSTRUCTION: You must output your final response strictly as a valid JSON object. Do not include markdown formatting like \`\`\`json. Your response must precisely match this schema:
{
  "priority": "URGENT" | "HIGH" | "STANDARD",
  "tradeCategory": string,
  "estimatedResponseTime": string,
  "dispatchMessage": string
}`,

  onComplete: async (response: string, contextId?: string) => {
    try {
      const cleanJsonStr = response.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsedPayload = JSON.parse(cleanJsonStr);

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
