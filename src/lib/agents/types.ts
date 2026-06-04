export interface AgentConfig {
  id: string; // e.g., 'rex'
  systemPrompt: string;
  tools?: any[]; // Optional: Specific tools for this agent
  executeTool?: (callName: string, args: any) => Promise<any>; // Localized tool execution logic
  onComplete?: (response: string, contextId?: string) => Promise<void>; // Post-generation DB writes
}
