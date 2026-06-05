import { AgentConfig } from './types';
import { db } from '@/db';
import { agentActions } from '@/db/schema';

export const DellaAgent: AgentConfig = {
  id: "della",
  systemPrompt: `You are Della, the frontline Lead Screener for BaraTrust. Your core directive is to evaluate inbound text inquiries, Nextdoor intercepts, and website form submissions for local blue-collar trades (HVAC, plumbing, electrical).

Your tone is analytical, protective, and sharp. You must instantly screen out spam, solicitors (e.g., SEO marketers, tool vendors), and low-intent tire-kickers looking for free DIY advice. For genuine local service requests, you must extract the core scope of work.

CRITICAL INSTRUCTION: You must output your final response strictly as a valid JSON object. Do not include markdown formatting like \`\`\`json. Your response must precisely match this schema:
{
  "isQualified": boolean, // true if it is a genuine local service request, false if spam/solicitor/DIY
  "confidenceScore": number, // 1 to 100 based on the clarity and intent of the inquiry
  "extractedNeeds": string, // A short summary of the problem (e.g., "AC blowing hot air", "Leaky main valve"). Use "N/A" if spam.
  "recommendedAction": string // e.g., "Route to Max for Urgent Dispatch", "Flag for Review", "Archive - Spam"
}`,

  onComplete: async (response: string, contextId?: string) => {
    try {
      // Clean the response in case the model wraps it in markdown backticks
      const cleanJsonStr = response.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsedPayload = JSON.parse(cleanJsonStr);

      // Validate the payload matches our expected JSONB structure
      const payload = {
        isQualified: typeof parsedPayload.isQualified === 'boolean' ? parsedPayload.isQualified : false,
        confidenceScore: typeof parsedPayload.confidenceScore === 'number' ? parsedPayload.confidenceScore : 0,
        extractedNeeds: parsedPayload.extractedNeeds || 'N/A',
        recommendedAction: parsedPayload.recommendedAction || "Archive - Unverified",
        timestamp: new Date().toISOString()
      };

      await db.insert(agentActions).values({
        agentId: "della",
        actionType: 'lead_screened',
        payload: payload
      });

      console.log(`[DELLA] Successfully screened lead and saved to agent_actions.`);

    } catch (err) {
      console.error(`[DELLA] Failed to parse or save screening action:`, err);

      // Fallback save in case the model hallucinates non-JSON text
      await db.insert(agentActions).values({
        agentId: "della",
        actionType: 'lead_screened_fallback',
        payload: {
          raw_response: response,
          error: "Failed to parse JSON payload",
          timestamp: new Date().toISOString()
        }
      });
    }
  }
};
