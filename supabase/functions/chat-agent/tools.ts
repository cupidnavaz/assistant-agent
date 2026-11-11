import { SERVICES } from "./constants.ts";
import { parseLeadInput, ValidationError, type LeadInput } from "./validation.ts";
import type { AgentMessage, ToolCall, ToolDefinition } from "./types.ts";

export type LeadSaver = (lead: LeadInput) => Promise<void>;

export const SAVE_LEAD_TOOL: ToolDefinition = {
  name: "save_lead",
  description:
    "Save a qualified sales lead once you have the customer's name, email or phone, the service they need, and a short project description.",
  parameters: {
    type: "object",
    properties: {
      name: { type: "string", description: "Customer's full name" },
      email_or_phone: { type: "string", description: "Customer's email address or phone number" },
      service: { type: "string", enum: [...SERVICES], description: "Service needed" },
      project_description: { type: "string", description: "Short description of the project" },
    },
    required: ["name", "email_or_phone", "service", "project_description"],
  },
};

export function parseToolInput(json: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(json || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function toolResult(call: ToolCall, ok: boolean, content: string): AgentMessage {
  return { role: "tool", toolCallId: call.id, name: call.name, ok, content };
}

export async function executeToolCall(call: ToolCall, saveLead: LeadSaver): Promise<AgentMessage> {
  if (call.name !== SAVE_LEAD_TOOL.name) return toolResult(call, false, "Unknown tool.");

  let lead: LeadInput;
  try {
    lead = parseLeadInput({
      name: call.input.name,
      contact: call.input.email_or_phone,
      service: call.input.service,
      project_description: call.input.project_description,
    });
  } catch (error) {
    if (!(error instanceof ValidationError)) throw error;
    return toolResult(call, false, "The lead details are incomplete. Ask the customer for the missing details.");
  }

  try {
    await saveLead(lead);
    return toolResult(call, true, "Lead saved. The team will follow up.");
  } catch (error) {
    console.error("save_lead failed", error);
    return toolResult(
      call,
      false,
      "The lead could not be saved. Ask the customer to contact the team by phone or email.",
    );
  }
}
