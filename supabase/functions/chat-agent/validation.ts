import {
  MAX_MESSAGES,
  MAX_MESSAGE_CHARS,
  MAX_SESSION_ID_CHARS,
  SERVICES,
} from "./constants.ts";
import { PROVIDER_IDS, type ProviderId } from "./types.ts";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type LeadInput = {
  name: string;
  contact: string;
  service: string;
  project_description: string;
};

export type ChatRequest = { sessionId: string; messages: ChatMessage[] };

export class ValidationError extends Error {}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9\s()-]{7,20}$/;

function requireString(value: unknown, field: string, maxChars: number): string {
  if (typeof value !== "string") throw new ValidationError(`${field} is required.`);
  const trimmed = value.trim();
  if (!trimmed) throw new ValidationError(`${field} is required.`);
  if (trimmed.length > maxChars) {
    throw new ValidationError(`${field} must be ${maxChars} characters or fewer.`);
  }
  return trimmed;
}

export function parseChatRequest(body: unknown): ChatRequest {
  if (!body || typeof body !== "object") throw new ValidationError("Invalid request.");
  const { sessionId, messages } = body as Record<string, unknown>;

  const session = requireString(sessionId, "Session", MAX_SESSION_ID_CHARS);
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new ValidationError("Please send a message.");
  }
  if (messages.length > MAX_MESSAGES) {
    throw new ValidationError("This conversation is too long. Please start a new chat.");
  }

  const parsed: ChatMessage[] = messages.map((item) => {
    if (!item || typeof item !== "object") throw new ValidationError("Invalid message.");
    const { role, content } = item as Record<string, unknown>;
    if (role !== "user" && role !== "assistant") throw new ValidationError("Invalid message.");
    const text = requireString(content, "Message", MAX_MESSAGE_CHARS);
    return { role, content: text };
  });

  if (parsed[parsed.length - 1].role !== "user") {
    throw new ValidationError("The last message must come from you.");
  }

  return { sessionId: session, messages: parsed };
}

export function parseLeadInput(value: unknown): LeadInput {
  if (!value || typeof value !== "object") throw new ValidationError("Invalid lead details.");
  const { name, contact, service, project_description } = value as Record<string, unknown>;

  const cleanName = requireString(name, "Name", 100);
  const cleanContact = requireString(contact, "Email or phone", 200);
  if (!EMAIL_PATTERN.test(cleanContact) && !PHONE_PATTERN.test(cleanContact)) {
    throw new ValidationError("Please enter a valid email address or phone number.");
  }
  const cleanService = requireString(service, "Service", 100);
  if (!(SERVICES as readonly string[]).includes(cleanService)) {
    throw new ValidationError("Please choose one of our services.");
  }
  const cleanDescription = requireString(project_description, "Project description", MAX_MESSAGE_CHARS);

  return {
    name: cleanName,
    contact: cleanContact,
    service: cleanService,
    project_description: cleanDescription,
  };
}

export type TestRequest = {
  provider: ProviderId;
  model: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  message: string;
};

export function parseTestRequest(body: unknown): TestRequest {
  if (!body || typeof body !== "object") throw new ValidationError("Invalid request.");
  const fields = body as Record<string, unknown>;

  if (!PROVIDER_IDS.includes(fields.provider as ProviderId)) {
    throw new ValidationError("Choose a valid provider.");
  }
  const temperature = Number(fields.temperature);
  if (!Number.isFinite(temperature) || temperature < 0 || temperature > 1) {
    throw new ValidationError("Temperature must be between 0 and 1.");
  }
  const maxTokens = Number(fields.maxTokens);
  if (!Number.isInteger(maxTokens) || maxTokens < 50 || maxTokens > 4000) {
    throw new ValidationError("Max tokens must be between 50 and 4000.");
  }

  return {
    provider: fields.provider as ProviderId,
    model: requireString(fields.model, "Model", 100),
    systemPrompt: requireString(fields.systemPrompt, "System prompt", 8000),
    temperature,
    maxTokens,
    message: requireString(fields.message, "Message", MAX_MESSAGE_CHARS),
  };
}
