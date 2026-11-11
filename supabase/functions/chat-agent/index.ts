import { RATE_LIMIT_PER_MINUTE } from "./constants.ts";
import { allowedOriginsFromEnv, isAllowedOrigin } from "./origins.ts";
import { runAgent, AgentUnavailableError } from "./agent.ts";
import { loadAgentSettings } from "./agentStore.ts";
import { isAdminRequest, providerStatus, runProviderTest } from "./admin.ts";
import { incrementRateLimit, insertLead, saveTranscript } from "./leads.ts";
import {
  parseChatRequest,
  parseLeadInput,
  parseTestRequest,
  ValidationError,
  type ChatMessage,
} from "./validation.ts";
import type { AgentMessage } from "./types.ts";

const UNAVAILABLE_REPLY = "\n\nSorry, I could not complete that just now. Please try again, or call 0707988777.";

function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  const allowedOrigin = origin && isAllowedOrigin(origin, allowedOriginsFromEnv()) ? origin : null;
  return {
    ...(allowedOrigin ? { "Access-Control-Allow-Origin": allowedOrigin } : {}),
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
    "Vary": "Origin",
  };
}

function jsonResponse(body: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for") ?? "";
  return forwarded.split(",")[0].trim() || req.headers.get("cf-connecting-ip") || "unknown";
}

function toAgentMessages(messages: ChatMessage[]): AgentMessage[] {
  return messages.map((message) =>
    message.role === "user"
      ? { role: "user", text: message.content }
      : { role: "assistant", text: message.content, toolCalls: [] }
  );
}

function streamReply(
  headers: Record<string, string>,
  chat: { sessionId: string; messages: ChatMessage[] },
): Response {
  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  let transcript = "";

  const write = (text: string) => {
    transcript += text;
    return writer.write(encoder.encode(text));
  };

  (async () => {
    try {
      const settings = await loadAgentSettings();
      await runAgent({
        settings,
        messages: toAgentMessages(chat.messages),
        onText: (text) => void write(text),
        saveLead: insertLead,
      });
      await saveTranscript(chat.sessionId, [
        ...chat.messages,
        { role: "assistant", content: transcript.trim() },
      ]).catch((error) => console.error("Transcript save failed", error));
    } catch (error) {
      if (!(error instanceof AgentUnavailableError)) console.error("chat-agent stream failed", error);
      await write(UNAVAILABLE_REPLY);
    } finally {
      await writer.close().catch(() => undefined);
    }
  })();

  return new Response(readable, {
    status: 200,
    headers: {
      ...headers,
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}

Deno.serve(async (req: Request) => {
  const headers = corsHeadersFor(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "This endpoint only accepts POST requests." }, 405, headers);
  }

  try {
    const hits = await incrementRateLimit(clientIp(req));
    if (hits > RATE_LIMIT_PER_MINUTE) {
      return jsonResponse(
        { error: "You are sending messages too quickly. Please wait a minute and try again." },
        429,
        headers,
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "The request could not be read. Please try again." }, 400, headers);
    }

    const action = (body as { action?: unknown })?.action;
    if (action === "submit_lead") {
      const lead = parseLeadInput((body as { lead?: unknown }).lead);
      await insertLead(lead);
      return jsonResponse({ ok: true }, 200, headers);
    }

    if (action === "provider_status" || action === "test_provider") {
      if (!(await isAdminRequest(req))) {
        return jsonResponse({ error: "This action is only available to admins." }, 403, headers);
      }
      if (action === "provider_status") {
        return jsonResponse({ providers: providerStatus() }, 200, headers);
      }
      const result = await runProviderTest(parseTestRequest(body));
      return jsonResponse(result, 200, headers);
    }

    const chat = parseChatRequest(body);
    return streamReply(headers, chat);
  } catch (error) {
    if (error instanceof ValidationError) {
      return jsonResponse({ error: error.message }, 400, headers);
    }
    console.error("chat-agent failed", error);
    return jsonResponse(
      { error: "Something went wrong on our side. Please try again in a moment." },
      500,
      headers,
    );
  }
});
