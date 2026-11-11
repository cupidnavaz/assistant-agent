import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;
const CODE_TTL_MS = 48 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const MIN_PASSWORD_LENGTH = 8;
const INVALID_CODE_MESSAGE = "That code is invalid or has expired. Ask an admin for a new code.";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const serviceClient = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length >= 3 && email.length <= 254 && email.includes("@") ? email : null;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function generateCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
}

async function isAdminRequest(req: Request): Promise<boolean> {
  const authorization = req.headers.get("Authorization");
  if (!authorization) return false;
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await callerClient.rpc("is_lead_admin");
  return !error && data === true;
}

async function requestActivation(client: SupabaseClient, email: string): Promise<Response> {
  const { data: member, error } = await client
    .from("team_members")
    .select("id, status")
    .eq("email", email)
    .maybeSingle();
  if (error) throw error;
  if (member?.status === "invited") {
    const { error: updateError } = await client
      .from("team_members")
      .update({ status: "awaiting_approval" })
      .eq("id", member.id);
    if (updateError) throw updateError;
  }
  return json({ ok: true });
}

async function approveMember(client: SupabaseClient, memberId: unknown): Promise<Response> {
  if (typeof memberId !== "string" || memberId.length === 0) {
    return json({ error: "A team member is required." }, 400);
  }
  const { data: member, error } = await client
    .from("team_members")
    .select("id, status")
    .eq("id", memberId)
    .maybeSingle();
  if (error) throw error;
  if (!member) return json({ error: "This team member no longer exists." }, 404);
  if (member.status === "active") {
    return json({ error: "This team member has already activated their account." }, 409);
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();
  const { error: updateError } = await client
    .from("team_members")
    .update({
      status: "approved",
      activation_code_hash: await sha256Hex(code),
      activation_code_expires_at: expiresAt,
      activation_attempts: 0,
    })
    .eq("id", member.id);
  if (updateError) throw updateError;

  return json({ code, expiresAt });
}

async function activateAccount(
  client: SupabaseClient,
  body: Record<string, unknown>,
): Promise<Response> {
  const email = normalizeEmail(body.email);
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !code) return json({ error: INVALID_CODE_MESSAGE }, 400);
  if (password.length < MIN_PASSWORD_LENGTH) {
    return json({ error: `Your password must be at least ${MIN_PASSWORD_LENGTH} characters.` }, 400);
  }

  const { data: member, error } = await client
    .from("team_members")
    .select("id, status, activation_code_hash, activation_code_expires_at, activation_attempts")
    .eq("email", email)
    .eq("status", "approved")
    .maybeSingle();
  if (error) throw error;

  const expired =
    !member?.activation_code_expires_at || new Date(member.activation_code_expires_at).getTime() < Date.now();
  if (!member || expired || member.activation_attempts >= MAX_ATTEMPTS) {
    return json({ error: INVALID_CODE_MESSAGE }, 400);
  }

  if ((await sha256Hex(code)) !== member.activation_code_hash) {
    await client
      .from("team_members")
      .update({ activation_attempts: member.activation_attempts + 1 })
      .eq("id", member.id);
    return json({ error: INVALID_CODE_MESSAGE }, 400);
  }

  const { data: created, error: createError } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError || !created.user) {
    return json({ error: "An account for this email already exists. Sign in with your password instead." }, 409);
  }

  const { error: updateError } = await client
    .from("team_members")
    .update({
      status: "active",
      user_id: created.user.id,
      activated_at: new Date().toISOString(),
      activation_code_hash: null,
      activation_code_expires_at: null,
      activation_attempts: 0,
    })
    .eq("id", member.id);
  if (updateError) throw updateError;

  return json({ ok: true });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body.action !== "string") return json({ error: "Invalid request." }, 400);

    if (body.action === "request_activation") {
      const email = normalizeEmail(body.email);
      if (!email) return json({ error: "Enter a valid email address." }, 400);
      return await requestActivation(serviceClient, email);
    }

    if (body.action === "activate") {
      return await activateAccount(serviceClient, body);
    }

    if (body.action === "approve") {
      if (!(await isAdminRequest(req))) return json({ error: "Not authorized." }, 403);
      return await approveMember(serviceClient, body.memberId);
    }

    return json({ error: "Unknown action." }, 400);
  } catch (err) {
    console.error("team-access failed", err);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
