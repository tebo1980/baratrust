export interface AgentConfig {
  id: string;
  systemPrompt: string;
  tools?: any[];
  executeTool?: (callName: string, args: any) => Promise<any>;
  onComplete?: (response: string, contextId?: string) => Promise<void>;
}
