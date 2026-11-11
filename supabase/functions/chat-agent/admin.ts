import { createClient } from "npm:@supabase/supabase-js@2";
import { logAgentRequest } from "./agentStore.ts";
import { apiKeyFor, PROVIDERS } from "./providers.ts";
import { PROVIDER_IDS, type ProviderId } from "./types.ts";
import type { TestRequest } from "./validation.ts";

export async function isAdminRequest(req: Request): Promise<boolean> {
  const authorization = req.headers.get("authorization");
  if (!authorization) return false;
  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.rpc("is_lead_admin");
  return !error && data === true;
}

export function providerStatus(): Record<ProviderId, boolean> {
  return Object.fromEntries(PROVIDER_IDS.map((id) => [id, apiKeyFor(id) !== null])) as Record<
    ProviderId,
    boolean
  >;
}

export type ProviderTestResult =
  | { ok: true; provider: ProviderId; model: string; reply: string; latencyMs: number }
  | { ok: false; provider: ProviderId; model: string; latencyMs: number; error: string };

export async function runProviderTest(input: TestRequest): Promise<ProviderTestResult> {
  const { provider, model } = input;
  const apiKey = apiKeyFor(provider);
  if (!apiKey) {
    return {
      ok: false,
      provider,
      model,
      latencyMs: 0,
      error: "No API key is set for this provider.",
    };
  }

  const started = Date.now();
  let reply = "";
  try {
    await PROVIDERS[provider].streamTurn(
      {
        apiKey,
        model,
        systemPrompt: input.systemPrompt,
        messages: [{ role: "user", text: input.message }],
        tools: [],
        temperature: input.temperature,
        maxTokens: input.maxTokens,
      },
      (text) => {
        reply += text;
      },
    );
    const latencyMs = Date.now() - started;
    await logAgentRequest({ provider, model, latencyMs, status: "ok", errorMessage: null });
    return { ok: true, provider, model, reply: reply.trim(), latencyMs };
  } catch (error) {
    const latencyMs = Date.now() - started;
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Provider test failed (${provider})`, message);
    await logAgentRequest({ provider, model, latencyMs, status: "error", errorMessage: message });
    return { ok: false, provider, model, latencyMs, error: message };
  }
}
