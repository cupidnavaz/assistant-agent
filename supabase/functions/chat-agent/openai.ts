import { parseToolInput } from "./tools.ts";
import { providerHttpError, readSse } from "./stream.ts";
import type { AgentMessage, ProviderAdapter, ProviderRequest, ProviderTurn, ToolCall } from "./types.ts";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

type OpenAIMessage = Record<string, unknown>;

function toOpenAIMessages(systemPrompt: string, messages: AgentMessage[]): OpenAIMessage[] {
  const out: OpenAIMessage[] = [{ role: "system", content: systemPrompt }];
  for (const message of messages) {
    if (message.role === "user") {
      out.push({ role: "user", content: message.text });
    } else if (message.role === "assistant") {
      out.push({
        role: "assistant",
        content: message.text || null,
        ...(message.toolCalls.length > 0
          ? {
              tool_calls: message.toolCalls.map((call) => ({
                id: call.id,
                type: "function",
                function: { name: call.name, arguments: JSON.stringify(call.input) },
              })),
            }
          : {}),
      });
    } else {
      out.push({ role: "tool", tool_call_id: message.toolCallId, content: message.content });
    }
  }
  return out;
}

type PartialCall = { id: string; name: string; args: string };

async function streamTurn(
  request: ProviderRequest,
  onText: (text: string) => void,
): Promise<ProviderTurn> {
  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${request.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: request.model,
      messages: toOpenAIMessages(request.systemPrompt, request.messages),
      temperature: request.temperature,
      max_completion_tokens: request.maxTokens,
      ...(request.tools.length > 0
        ? {
            tools: request.tools.map((tool) => ({
              type: "function",
              function: { name: tool.name, description: tool.description, parameters: tool.parameters },
            })),
          }
        : {}),
      stream: true,
    }),
  });
  if (!response.ok || !response.body) throw await providerHttpError("OpenAI", response);

  let text = "";
  const partials = new Map<number, PartialCall>();

  for await (const event of readSse(response.body)) {
    if (event.error) {
      throw new Error(`OpenAI stream error: ${event.error.message ?? "unknown"}`);
    }
    const delta = event.choices?.[0]?.delta;
    if (!delta) continue;
    if (typeof delta.content === "string" && delta.content.length > 0) {
      text += delta.content;
      onText(delta.content);
    }
    for (const part of delta.tool_calls ?? []) {
      const index = typeof part.index === "number" ? part.index : 0;
      const call = partials.get(index) ?? { id: `call_${index}`, name: "", args: "" };
      if (typeof part.id === "string") call.id = part.id;
      if (typeof part.function?.name === "string") call.name += part.function.name;
      if (typeof part.function?.arguments === "string") call.args += part.function.arguments;
      partials.set(index, call);
    }
  }

  const toolCalls: ToolCall[] = [...partials.values()].map((call) => ({
    id: call.id,
    name: call.name,
    input: parseToolInput(call.args),
  }));
  return { text, toolCalls };
}

export const openaiAdapter: ProviderAdapter = {
  id: "openai",
  label: "GPT",
  keyEnv: "OPENAI_API_KEY",
  streamTurn,
};
