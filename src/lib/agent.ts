import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from '@/lib/supabase';

export const AGENT_PROVIDERS = ['anthropic', 'openai', 'gemini'] as const;
export type AgentProvider = (typeof AGENT_PROVIDERS)[number];

export const AGENT_PROVIDER_LABELS: Record<AgentProvider, string> = {
  anthropic: 'Claude',
  openai: 'GPT',
  gemini: 'Gemini',
};

export const AGENT_PROVIDER_DESCRIPTIONS: Record<AgentProvider, string> = {
  anthropic: 'Anthropic’s Claude models. Careful, warm replies and strong instruction following.',
  openai: 'OpenAI’s GPT models. Fast, versatile and widely supported.',
  gemini: 'Google’s Gemini models. Quick responses with a generous context window.',
};

export const DEFAULT_MODELS: Record<AgentProvider, string> = {
  anthropic: 'claude-sonnet-5-5',
  openai: 'gpt-4o-mini',
  gemini: 'gemini-2.0-flash',
};

export const MODEL_MAX_CHARS = 100;
export const SYSTEM_PROMPT_MAX_CHARS = 8000;
export const TEST_MESSAGE_MAX_CHARS = 1000;
export const MAX_TOKENS_RANGE = { min: 50, max: 4000 } as const;

export const DEFAULT_SYSTEM_PROMPT = `You are the customer service assistant for CupidCreativeX ("Visually Transforming..."), a digital agency that helps businesses streamline operations and grow through digital solutions.

SERVICES: Web & App Development, Generative AI Services, UI/UX Design, Data Analytics & Insights, Graphics Design, Digital Consultation, Digital Marketing.

OFFER: 20% off a customer's first project.

CONTACT: Phone 0707988777, 09039454419. Email info@cupidcreativex.com. Website cupidcreativex.com.

BEHAVIOR: Be friendly, professional and concise (2-4 sentences). Answer only from the information above. Never quote prices, timelines or guarantees; say the team provides a quote after learning about the project. If unsure, say so and offer to connect them with the team. To book or get a quote, collect name, email or phone, service needed and a short project description, then call save_lead and confirm the team will follow up. Politely decline unrelated topics. If the customer is upset or asks for a human, share the phone and email.`;

export type AgentSettings = {
  active_provider: AgentProvider;
  model_anthropic: string;
  model_openai: string;
  model_gemini: string;
  temperature: number;
  max_tokens: number;
  system_prompt: string;
  fallback_enabled: boolean;
  updated_at: string;
};

export type EditableAgentSettings = Omit<AgentSettings, 'updated_at'>;

export type AgentLog = {
  id: string;
  provider: AgentProvider;
  model: string;
  latency_ms: number;
  status: 'ok' | 'error';
  error_message: string | null;
  created_at: string;
};

export type ProviderTestResult =
  | { ok: true; provider: AgentProvider; model: string; reply: string; latencyMs: number }
  | { ok: false; provider: AgentProvider; model: string; latencyMs: number; error: string };

export type ProviderUsage = {
  provider: AgentProvider;
  requests: number;
  errors: number;
  averageLatencyMs: number;
  errorRate: number;
};

const SETTINGS_COLUMNS =
  'active_provider, model_anthropic, model_openai, model_gemini, temperature, max_tokens, system_prompt, fallback_enabled, updated_at';

export type ModelFields = Pick<EditableAgentSettings, 'model_anthropic' | 'model_openai' | 'model_gemini'>;

export const MODEL_FIELD: Record<AgentProvider, keyof ModelFields> = {
  anthropic: 'model_anthropic',
  openai: 'model_openai',
  gemini: 'model_gemini',
};

export async function fetchAgentSettings(): Promise<AgentSettings> {
  const { data, error } = await supabase
    .from('agent_settings')
    .select(SETTINGS_COLUMNS)
    .eq('id', 1)
    .maybeSingle();
  if (error) throw new Error('The AI agent settings could not be loaded.');
  if (!data) throw new Error('The AI agent settings are missing.');
  return { ...data, temperature: Number(data.temperature), max_tokens: Number(data.max_tokens) } as AgentSettings;
}

export async function saveAgentSettings(settings: EditableAgentSettings): Promise<void> {
  const { error } = await supabase
    .from('agent_settings')
    .update({
      active_provider: settings.active_provider,
      model_anthropic: settings.model_anthropic,
      model_openai: settings.model_openai,
      model_gemini: settings.model_gemini,
      temperature: settings.temperature,
      max_tokens: settings.max_tokens,
      system_prompt: settings.system_prompt,
      fallback_enabled: settings.fallback_enabled,
    })
    .eq('id', 1);
  if (error) throw new Error('The AI agent settings could not be saved.');
}

export async function fetchAgentLogs(limit: number): Promise<AgentLog[]> {
  const { data, error } = await supabase
    .from('agent_logs')
    .select('id, provider, model, latency_ms, status, error_message, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error('The usage logs could not be loaded.');
  return (data ?? []) as AgentLog[];
}

async function invokeAgentFunction<T>(body: Record<string, unknown>): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token ?? SUPABASE_ANON_KEY;
  const response = await fetch(`${SUPABASE_URL}/functions/v1/chat-agent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) throw new Error(payload?.error ?? 'The AI agent service could not be reached.');
  return payload as T;
}

export async function fetchProviderStatus(): Promise<Record<AgentProvider, boolean>> {
  const result = await invokeAgentFunction<{ providers: Record<AgentProvider, boolean> }>({
    action: 'provider_status',
  });
  return result.providers;
}

export async function runAgentTest(input: {
  provider: AgentProvider;
  model: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  message: string;
}): Promise<ProviderTestResult> {
  return invokeAgentFunction<ProviderTestResult>({ action: 'test_provider', ...input });
}

export function summarizeUsage(logs: AgentLog[], now: number = Date.now()): ProviderUsage[] {
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  return AGENT_PROVIDERS.map((provider) => {
    const recent = logs.filter(
      (log) => log.provider === provider && Date.parse(log.created_at) >= weekAgo,
    );
    const successes = recent.filter((log) => log.status === 'ok');
    const errors = recent.length - successes.length;
    const latencyTotal = successes.reduce((sum, log) => sum + log.latency_ms, 0);
    return {
      provider,
      requests: recent.length,
      errors,
      averageLatencyMs: successes.length > 0 ? Math.round(latencyTotal / successes.length) : 0,
      errorRate: recent.length > 0 ? errors / recent.length : 0,
    };
  });
}
