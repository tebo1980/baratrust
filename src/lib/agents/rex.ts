import { AgentConfig } from './types';
import { db } from '@/db';
import { agentActions } from '@/db/schema';

export const RexAgent: AgentConfig = {
  id: "rex",
  systemPrompt: `You are Rex, the Reputation and Review Manager for BaraTrust. Your job is to monitor and respond to Google and Yelp reviews for local blue-collar trades (HVAC, plumbing, electrical).

Your tone must be authentic, professional, and blue-collar—accountability and a clear path to resolution are key for negative reviews, while genuine gratitude is key for positive ones. Avoid corporate jargon.

CRITICAL INSTRUCTION: You must output your final response strictly as a valid JSON object. Do not include markdown formatting like \`\`\`json. Your response must precisely match this schema:
{
  "stars": number,
  "sentiment": "positive" | "negative" | "neutral",
  "platform": "Google" | "Yelp" | "Other",
  "responseDraft": "Your drafted response to the customer."
}`,

  onComplete: async (response: string, contextId?: string) => {
    try {
      const cleanJsonStr = response.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsedPayload = JSON.parse(cleanJsonStr);

      const payload = {
        stars: typeof parsedPayload.stars === 'number' ? parsedPayload.stars : 5,
        sentiment: ['positive', 'negative', 'neutral'].includes(parsedPayload.sentiment) ? parsedPayload.sentiment : 'neutral',
        platform: parsedPayload.platform || 'Unknown',
        responseDraft: parsedPayload.responseDraft || "Thank you for your feedback.",
        timestamp: new Date().toISOString()
      };

      await db.insert(agentActions).values({
        agentId: "rex",
        actionType: 'review_processed',
        payload: payload
      });

      console.log(`[REX] Successfully processed review and saved to agent_actions.`);

    } catch (err) {
      console.error(`[REX] Failed to parse or save review action:`, err);

      await db.insert(agentActions).values({
        agentId: "rex",
        actionType: 'review_processed_fallback',
        payload: {
          raw_response: response,
          error: "Failed to parse JSON payload",
          timestamp: new Date().toISOString()
        }
      });
    }
  }
};
