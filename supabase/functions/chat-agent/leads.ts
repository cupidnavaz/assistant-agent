import { db as supabase } from "./db.ts";
import type { LeadInput } from "./validation.ts";

export async function insertLead(lead: LeadInput): Promise<void> {
  const { error } = await supabase.from("leads").insert({
    name: lead.name,
    contact: lead.contact,
    service: lead.service,
    project_description: lead.project_description,
    source: "chat-widget",
  });
  if (error) throw new Error(`Lead insert failed: ${error.message}`);
}

export async function incrementRateLimit(ip: string): Promise<number> {
  const { data, error } = await supabase.rpc("increment_chat_rate_limit", { p_ip: ip });
  if (error) throw new Error(`Rate limit check failed: ${error.message}`);
  return Number(data);
}

export async function saveTranscript(
  sessionId: string,
  messages: { role: string; content: string }[],
): Promise<void> {
  const { error } = await supabase
    .from("chat_sessions")
    .upsert({ session_id: sessionId, messages }, { onConflict: "session_id" });
  if (error) throw new Error(`Transcript save failed: ${error.message}`);
}
