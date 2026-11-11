import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase';

export type ApiMessage = { role: 'user' | 'assistant'; content: string };

export type LeadPayload = {
  name: string;
  contact: string;
  service: string;
  project_description: string;
};

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/chat-agent`;

const GENERIC_ERROR = 'Something went wrong. Please try again in a moment.';

function requestHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    apikey: SUPABASE_ANON_KEY,
  };
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const data: unknown = await response.json();
    if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
      return data.error;
    }
  } catch {
    // body was not JSON; fall through to the generic message
  }
  return GENERIC_ERROR;
}

export async function streamChatReply(params: {
  sessionId: string;
  messages: ApiMessage[];
  signal: AbortSignal;
  onText: (text: string) => void;
}): Promise<void> {
  const response = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: requestHeaders(),
    body: JSON.stringify({ sessionId: params.sessionId, messages: params.messages }),
    signal: params.signal,
  });

  if (!response.ok) throw new Error(await readErrorMessage(response));
  if (!response.body) throw new Error(GENERIC_ERROR);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });
    if (text) params.onText(text);
  }
  const tail = decoder.decode();
  if (tail) params.onText(tail);
}

export async function submitLead(lead: LeadPayload, signal?: AbortSignal): Promise<void> {
  const response = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: requestHeaders(),
    body: JSON.stringify({ action: 'submit_lead', lead }),
    signal,
  });

  if (!response.ok) throw new Error(await readErrorMessage(response));

  const data: unknown = await response.json().catch(() => null);
  if (!data || typeof data !== 'object' || !('ok' in data) || data.ok !== true) {
    throw new Error(GENERIC_ERROR);
  }
}
