import { parseToolInput } from "./tools.ts";
import { providerHttpError, readSse } from "./stream.ts";
import type { AgentMessage, ProviderAdapter, ProviderRequest, ProviderTurn, ToolCall } from "./types.ts";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

type AnthropicBlock = Record<string, unknown>;
type AnthropicMessage = { role: "user" | "assistant"; content: string | AnthropicBlock[] };

function toAnthropicMessages(messages: AgentMessage[]): AnthropicMessage[] {
  const out: AnthropicMessage[] = [];
  for (const message of messages) {
    if (message.role === "user") {
      out.push({ role: "user", content: message.text });
    } else if (message.role === "assistant") {
      const blocks: AnthropicBlock[] = [];
      if (message.text) blocks.push({ type: "text", text: message.text });
      for (const call of message.toolCalls) {
        blocks.push({ type: "tool_use", id: call.id, name: call.name, input: call.input });
      }
      if (blocks.length > 0) out.push({ role: "assistant", content: blocks });
    } else {
      const block: AnthropicBlock = {
        type: "tool_result",
        tool_use_id: message.toolCallId,
        content: message.content,
        is_error: !message.ok,
      };
      const last = out[out.length - 1];
      if (last && last.role === "user" && Array.isArray(last.content)) {
        last.content.push(block);
      } else {
        out.push({ role: "user", content: [block] });
      }
    }
  }
  return out;
}

async function streamTurn(
  request: ProviderRequest,
  onText: (text: string) => void,
): Promise<ProviderTurn> {
  const response = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": request.apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: request.model,
      max_tokens: request.maxTokens,
      temperature: request.temperature,
      system: request.systemPrompt,
      messages: toAnthropicMessages(request.messages),
      ...(request.tools.length > 0
        ? {
            tools: request.tools.map((tool) => ({
              name: tool.name,
              description: tool.description,
              input_schema: tool.parameters,
            })),
          }
        : {}),
      stream: true,
    }),
  });
  if (!response.ok || !response.body) throw await providerHttpError("Anthropic", response);

  let text = "";
  const calls: { id: string; name: string; json: string }[] = [];
  let currentCall: { id: string; name: string; json: string } | null = null;

  for await (const event of readSse(response.body)) {
    if (event.type === "content_block_start") {
      const block = event.content_block;
      if (block.type === "tool_use") {
        currentCall = { id: block.id, name: block.name, json: "" };
        calls.push(currentCall);
      } else {
        currentCall = null;
      }
    } else if (event.type === "content_block_delta") {
      if (event.delta.type === "text_delta") {
        text += event.delta.text;
        onText(event.delta.text);
      } else if (event.delta.type === "input_json_delta" && currentCall) {
        currentCall.json += event.delta.partial_json;
      }
    } else if (event.type === "content_block_stop") {
      currentCall = null;
    } else if (event.type === "error") {
      throw new Error(`Anthropic stream error: ${event.error?.message ?? "unknown"}`);
    }
  }

  const toolCalls: ToolCall[] = calls.map((call) => ({
    id: call.id,
    name: call.name,
    input: parseToolInput(call.json),
  }));
  return { text, toolCalls };
}

export const anthropicAdapter: ProviderAdapter = {
  id: "anthropic",
  label: "Claude",
  keyEnv: "ANTHROPIC_API_KEY",
  streamTurn,
};
