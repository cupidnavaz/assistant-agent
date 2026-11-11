import { DEFAULT_ALLOWED_ORIGINS } from "./constants.ts";

const EXACT_ENTRY = /^(https:\/\/[a-z0-9.-]+(:\d+)?|http:\/\/localhost(:\d+)?)$/;
const PREVIEW_ENTRY = /^https:\/\/[a-z0-9-]+-\*-[a-z0-9-]+\.vercel\.app$/;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function entryMatches(entry: string, origin: string): boolean {
  if (!entry.includes("*")) return origin === entry;
  const pattern = new RegExp(`^${entry.split("*").map(escapeRegex).join("[a-z0-9-]+")}$`);
  return pattern.test(origin);
}

export function allowedOriginsFromEnv(): string[] {
  const raw = Deno.env.get("ALLOWED_ORIGINS")?.trim();
  const entries = raw
    ? raw.split(",").map((entry) => entry.trim().toLowerCase()).filter((entry) => entry.length > 0)
    : DEFAULT_ALLOWED_ORIGINS;
  return entries.filter((entry) => {
    const valid = entry.includes("*") ? PREVIEW_ENTRY.test(entry) : EXACT_ENTRY.test(entry);
    if (!valid) console.error(`Ignoring invalid ALLOWED_ORIGINS entry: ${entry}`);
    return valid;
  });
}

export function isAllowedOrigin(origin: string, entries: string[]): boolean {
  const normalized = origin.toLowerCase();
  return entries.some((entry) => entryMatches(entry, normalized));
}
