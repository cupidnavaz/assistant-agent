import { anthropicAdapter } from "./anthropic.ts";
import { geminiAdapter } from "./gemini.ts";
import { openaiAdapter } from "./openai.ts";
import type { ProviderAdapter, ProviderId } from "./types.ts";

export const PROVIDERS: Record<ProviderId, ProviderAdapter> = {
  anthropic: anthropicAdapter,
  openai: openaiAdapter,
  gemini: geminiAdapter,
};

export function apiKeyFor(id: ProviderId): string | null {
  const value = Deno.env.get(PROVIDERS[id].keyEnv)?.trim();
  return value ? value : null;
}
