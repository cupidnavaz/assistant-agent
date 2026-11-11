import { parseToolInput } from "./tools.ts";
import { providerHttpError, readSse } from "./stream.ts";
import type { AgentMessage, ProviderAdapter, ProviderRequest, ProviderTurn, ToolCall } from "./types.ts";

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

type GeminiPart = Record<string, unknown>;
type GeminiContent = { role: "user" | "model"; parts: GeminiPart[] };

function toGeminiSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(toGeminiSchema);
  if (!node || typeof node !== "object") return node;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    out[key] = key === "type" && typeof value === "string" ? value.toUpperCase() : toGeminiSchema(value);
  }
  return out;
}

function toGeminiContents(messages: AgentMessage[]): GeminiContent[] {
  const out: GeminiContent[] = [];
  for (const message of messages) {
    if (message.role === "user") {
      out.push({ role: "user", parts: [{ text: message.text }] });
    } else if (message.role === "assistant") {
      const parts: GeminiPart[] = [];
      if (message.text) parts.push({ text: message.text });
      for (const call of message.toolCalls) {
        parts.push({ functionCall: { name: call.name, args: call.input } });
      }
      if (parts.length > 0) out.push({ role: "model", parts });
    } else {
      const part: GeminiPart = {
        functionResponse: { name: message.name, response: { ok: message.ok, content: message.content } },
      };
      const last = out[out.length - 1];
      if (last && last.role === "user" && last.parts[0] && "functionResponse" in last.parts[0]) {
        last.parts.push(part);
      } else {
        out.push({ role: "user", parts: [part] });
      }
    }
  }
  return out;
}

async function streamTurn(
  request: ProviderRequest,
  onText: (text: string) => void,
): Promise<ProviderTurn> {
  const url = `${GEMINI_BASE_URL}/${encodeURIComponent(request.model)}:streamGenerateContent?alt=sse`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "x-goog-api-key": request.apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: request.systemPrompt }] },
      contents: toGeminiContents(request.messages),
      generationConfig: {
        temperature: request.temperature,
        maxOutputTokens: request.maxTokens,
      },
      ...(request.tools.length > 0
        ? {
            tools: [
              {
                functionDeclarations: request.tools.map((tool) => ({
                  name: tool.name,
                  description: tool.description,
                  parameters: toGeminiSchema(tool.parameters),
                })),
              },
            ],
          }
        : {}),
    }),
  });
  if (!response.ok || !response.body) throw await providerHttpError("Gemini", response);

  let text = "";
  const toolCalls: ToolCall[] = [];

  for await (const event of readSse(response.body)) {
    if (event.error) {
      throw new Error(`Gemini stream error: ${event.error.message ?? "unknown"}`);
    }
    const parts: GeminiPart[] = event.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      if (typeof part.text === "string" && part.text.length > 0 && !part.thought) {
        text += part.text;
        onText(part.text);
      }
      const call = part.functionCall as { name?: string; args?: Record<string, unknown> } | undefined;
      if (call?.name) {
        toolCalls.push({
          id: `gemini_call_${toolCalls.length}`,
          name: call.name,
          input: call.args ?? {},
        });
      }
    }
  }

  return { text, toolCalls };
}

export const geminiAdapter: ProviderAdapter = {
  id: "gemini",
  label: "Gemini",
  keyEnv: "GEMINI_API_KEY",
  streamTurn,
};
