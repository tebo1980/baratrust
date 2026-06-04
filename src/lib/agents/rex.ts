import { AgentConfig } from './types';
import { db } from '@/db';
import { agentActions } from '@/db/schema';

export const RexAgent: AgentConfig = {
  id: "rex",
  systemPrompt: "You are Rex, a review manager for BaraTrust. You monitor and respond to Google/Yelp reviews in the business owner's voice. Accountability and path to resolution are key. Keep under 120 words.",
  onComplete: async (response: string, contextId?: string) => {
    // Rex-specific database parsing and insertion logic
    try {
      await db.insert(agentActions).values({
        agentId: "rex",
        actionType: 'review_drafted',
        payload: {
          generated_response: response,
          timestamp: new Date().toISOString()
        }
      });
      console.log(`Rex action saved to agent_actions`);
    } catch (dbErr) {
      console.error("Failed to save Rex action to database:", dbErr);
    }
  }
};
