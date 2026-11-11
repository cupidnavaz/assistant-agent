export const PROVIDER_IDS = ["anthropic", "openai", "gemini"] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

export type ToolCall = { id: string; name: string; input: Record<string, unknown> };

export type AgentMessage =
  | { role: "user"; text: string }
  | { role: "assistant"; text: string; toolCalls: ToolCall[] }
  | { role: "tool"; toolCallId: string; name: string; ok: boolean; content: string };

export type ToolDefinition = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export type ProviderRequest = {
  apiKey: string;
  model: string;
  systemPrompt: string;
  messages: AgentMessage[];
  tools: ToolDefinition[];
  temperature: number;
  maxTokens: number;
};

export type ProviderTurn = { text: string; toolCalls: ToolCall[] };

export interface ProviderAdapter {
  readonly id: ProviderId;
  readonly label: string;
  readonly keyEnv: string;
  streamTurn(request: ProviderRequest, onText: (text: string) => void): Promise<ProviderTurn>;
}
