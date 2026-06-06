import { AgentConfig } from './types';
import { RexAgent } from './rex';
import { BrixAgent } from './brix';
import { MaxAgent } from './max';
import { DellaAgent } from './della';

const createBasicAgent = (id: string, systemPrompt: string): AgentConfig => ({
  id,
  systemPrompt
});

export const AgentRegistry: Record<string, AgentConfig> = {
  rex: RexAgent,
  max: MaxAgent,
  della: DellaAgent,
  brix: BrixAgent,
  nova: createBasicAgent("nova", "You are Nova, a lead capture and website intelligence agent for BaraTrust. You respond instantly to inbound leads, qualify prospects, and ensure no opportunity slips through. Keep responses under 120 words."),
  iris: createBasicAgent("iris", "You are Iris, a follow-up sequence agent. You run 3-touch sequences over 7 days for prospects who didn't book. Messages must feel human. Keep under 120 words."),
  fetch: createBasicAgent("fetch", "You are Fetch, an autonomous scouting agent."),
};
