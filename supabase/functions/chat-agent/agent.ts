import { apiKeyFor, PROVIDERS } from "./providers.ts";
import { SAVE_LEAD_TOOL, executeToolCall, type LeadSaver } from "./tools.ts";
import { logAgentRequest, type AgentSettings } from "./agentStore.ts";
import type { AgentMessage, ProviderId } from "./types.ts";
import { PROVIDER_IDS } from "./types.ts";

const DEFAULT_REPLY = "Thanks for your message. Could you tell me a little more about what you need?";

export class AgentUnavailableError extends Error {}

type RunParams = {
  settings: AgentSettings;
  messages: AgentMessage[];
  onText: (text: string) => void;
  saveLead: LeadSaver;
};

export function providerChain(active: ProviderId, fallbackEnabled: boolean): ProviderId[] {
  if (!fallbackEnabled) return [active];
  return [active, ...PROVIDER_IDS.filter((id) => id !== active)];
}

async function runAttempt(
  providerId: ProviderId,
  settings: AgentSettings,
  messages: AgentMessage[],
  emit: (text: string) => void,
  saveLead: LeadSaver,
): Promise<void> {
  const model = settings.models[providerId];
  const apiKey = apiKeyFor(providerId);
  if (!apiKey) {
    await logAgentRequest({
      provider: providerId,
      model,
      latencyMs: 0,
      status: "error",
      errorMessage: "API key is not configured",
    });
    throw new Error(`${providerId} API key is not configured`);
  }

  const adapter = PROVIDERS[providerId];
  const started = Date.now();
  const base = {
    apiKey,
    model,
    systemPrompt: settings.systemPrompt,
    tools: [SAVE_LEAD_TOOL],
    temperature: settings.temperature,
    maxTokens: settings.maxTokens,
  };

  try {
    const first = await adapter.streamTurn({ ...base, messages }, emit);
    if (first.toolCalls.length > 0) {
      const results: AgentMessage[] = [];
      for (const call of first.toolCalls) {
        results.push(await executeToolCall(call, saveLead));
      }
      const followUp: AgentMessage[] = [
        ...messages,
        { role: "assistant", text: first.text, toolCalls: first.toolCalls },
        ...results,
      ];
      await adapter.streamTurn({ ...base, messages: followUp }, emit);
    }
    await logAgentRequest({
      provider: providerId,
      model,
      latencyMs: Date.now() - started,
      status: "ok",
      errorMessage: null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Agent attempt failed (${providerId})`, message);
    await logAgentRequest({
      provider: providerId,
      model,
      latencyMs: Date.now() - started,
      status: "error",
      errorMessage: message,
    });
    throw error;
  }
}

export async function runAgent({ settings, messages, onText, saveLead }: RunParams): Promise<void> {
  let emitted = false;
  const emit = (text: string) => {
    emitted = true;
    onText(text);
  };

  for (const providerId of providerChain(settings.activeProvider, settings.fallbackEnabled)) {
    try {
      await runAttempt(providerId, settings, messages, emit, saveLead);
      if (!emitted) emit(DEFAULT_REPLY);
      return;
    } catch (error) {
      if (emitted) throw error;
    }
  }

  throw new AgentUnavailableError("No AI provider is available");
}
