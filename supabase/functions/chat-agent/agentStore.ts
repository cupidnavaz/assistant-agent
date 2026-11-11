import { db } from "./db.ts";
import { PROVIDER_IDS, type ProviderId } from "./types.ts";

export type AgentSettings = {
  activeProvider: ProviderId;
  models: Record<ProviderId, string>;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  fallbackEnabled: boolean;
};

export type AgentLogEntry = {
  provider: ProviderId;
  model: string;
  latencyMs: number;
  status: "ok" | "error";
  errorMessage: string | null;
};

const CACHE_TTL_MS = 30_000;
let cached: { value: AgentSettings; expiresAt: number } | null = null;

function parseSettingsRow(row: Record<string, unknown>): AgentSettings {
  const activeProvider = row.active_provider;
  if (!PROVIDER_IDS.includes(activeProvider as ProviderId)) {
    throw new Error("agent_settings.active_provider is invalid");
  }
  if (typeof row.system_prompt !== "string") throw new Error("agent_settings.system_prompt is invalid");
  return {
    activeProvider: activeProvider as ProviderId,
    models: {
      anthropic: String(row.model_anthropic),
      openai: String(row.model_openai),
      gemini: String(row.model_gemini),
    },
    temperature: Number(row.temperature),
    maxTokens: Number(row.max_tokens),
    systemPrompt: row.system_prompt,
    fallbackEnabled: row.fallback_enabled === true,
  };
}

export async function loadAgentSettings(): Promise<AgentSettings> {
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const { data, error } = await db
    .from("agent_settings")
    .select(
      "active_provider, model_anthropic, model_openai, model_gemini, temperature, max_tokens, system_prompt, fallback_enabled",
    )
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new Error(`Agent settings load failed: ${error.message}`);
  if (!data) throw new Error("Agent settings row is missing");

  const value = parseSettingsRow(data);
  cached = { value, expiresAt: Date.now() + CACHE_TTL_MS };
  return value;
}

export async function logAgentRequest(entry: AgentLogEntry): Promise<void> {
  const { error } = await db.from("agent_logs").insert({
    provider: entry.provider,
    model: entry.model,
    latency_ms: Math.max(0, Math.round(entry.latencyMs)),
    status: entry.status,
    error_message: entry.errorMessage,
  });
  if (error) console.error("Agent log write failed", error.message);
}
