import { supabase } from '@/lib/supabase';

export const TEAM_PERMISSIONS = ['leads:view', 'leads:edit', 'leads:delete'] as const;
export type TeamPermission = (typeof TEAM_PERMISSIONS)[number];

export const TEAM_PERMISSION_LABELS: Record<TeamPermission, { label: string; description: string }> = {
  'leads:view': { label: 'View leads', description: 'See enquiries and their details.' },
  'leads:edit': { label: 'Edit leads', description: 'Change lead details and status.' },
  'leads:delete': { label: 'Delete leads', description: 'Permanently remove enquiries.' },
};

export const TEAM_STATUSES = ['invited', 'awaiting_approval', 'approved', 'active'] as const;
export type TeamStatus = (typeof TEAM_STATUSES)[number];

export const TEAM_STATUS_LABELS: Record<TeamStatus, string> = {
  invited: 'Invited',
  awaiting_approval: 'Awaiting approval',
  approved: 'Code issued',
  active: 'Active',
};

export type TeamMember = {
  id: string;
  email: string;
  name: string;
  permissions: TeamPermission[];
  status: TeamStatus;
  user_id: string | null;
  created_at: string;
  activated_at: string | null;
  activation_code_expires_at: string | null;
  avatar_url: string | null;
};

export type TeamMemberInput = {
  email: string;
  name: string;
  permissions: TeamPermission[];
};

export type ActivationCode = { code: string; expiresAt: string };

const TEAM_COLUMNS =
  'id, email, name, permissions, status, user_id, created_at, activated_at, activation_code_expires_at, avatar_url';
const GENERIC_ERROR = 'Something went wrong. Please try again.';
const DUPLICATE_EMAIL_CODE = '23505';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isTeamMember(value: unknown): value is TeamMember {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.email === 'string' &&
    typeof value.name === 'string' &&
    Array.isArray(value.permissions) &&
    value.permissions.every((p) => TEAM_PERMISSIONS.includes(p as TeamPermission)) &&
    TEAM_STATUSES.includes(value.status as TeamStatus) &&
    (value.user_id === null || typeof value.user_id === 'string') &&
    typeof value.created_at === 'string' &&
    (value.activated_at === null || typeof value.activated_at === 'string') &&
    (value.activation_code_expires_at === null || typeof value.activation_code_expires_at === 'string') &&
    (value.avatar_url === null || typeof value.avatar_url === 'string')
  );
}

export async function fetchTeamMembers(): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from('team_members')
    .select(TEAM_COLUMNS)
    .order('created_at', { ascending: false });
  if (error) throw new Error(GENERIC_ERROR);
  if (!Array.isArray(data) || !data.every(isTeamMember)) throw new Error(GENERIC_ERROR);
  return data;
}

export async function fetchOwnTeamMember(): Promise<TeamMember | null> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw new Error(GENERIC_ERROR);
  const userId = sessionData.session?.user.id;
  if (!userId) return null;
  const { data, error } = await supabase
    .from('team_members')
    .select(TEAM_COLUMNS)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(GENERIC_ERROR);
  if (data === null) return null;
  if (!isTeamMember(data)) throw new Error(GENERIC_ERROR);
  return data;
}

export async function addTeamMember(input: TeamMemberInput): Promise<void> {
  const { data, error } = await supabase
    .from('team_members')
    .insert({ email: input.email.trim().toLowerCase(), name: input.name.trim(), permissions: input.permissions })
    .select('id');
  if (error?.code === DUPLICATE_EMAIL_CODE) throw new Error('A team member with this email already exists.');
  if (error || !data || data.length === 0) throw new Error(GENERIC_ERROR);
}

export async function updateTeamMember(id: string, input: Pick<TeamMemberInput, 'name' | 'permissions'>): Promise<void> {
  const { data, error } = await supabase
    .from('team_members')
    .update({ name: input.name.trim(), permissions: input.permissions })
    .eq('id', id)
    .select('id');
  if (error || !data || data.length === 0) throw new Error(GENERIC_ERROR);
}

export async function deleteTeamMember(id: string): Promise<void> {
  const { data, error } = await supabase.from('team_members').delete().eq('id', id).select('id');
  if (error || !data || data.length === 0) throw new Error(GENERIC_ERROR);
}

async function invokeTeamAccess(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.functions.invoke<unknown>('team-access', { body });
  if (error) {
    const context = (error as { context?: unknown }).context;
    if (context instanceof Response) {
      const payload: unknown = await context.json().catch(() => null);
      if (isRecord(payload) && typeof payload.error === 'string') throw new Error(payload.error);
    }
    throw new Error(GENERIC_ERROR);
  }
  if (!isRecord(data)) throw new Error(GENERIC_ERROR);
  if (typeof data.error === 'string') throw new Error(data.error);
  return data;
}

export async function requestActivation(email: string): Promise<void> {
  await invokeTeamAccess({ action: 'request_activation', email: email.trim() });
}

export async function approveTeamMember(memberId: string): Promise<ActivationCode> {
  const data = await invokeTeamAccess({ action: 'approve', memberId });
  if (typeof data.code !== 'string' || typeof data.expiresAt !== 'string') throw new Error(GENERIC_ERROR);
  return { code: data.code, expiresAt: data.expiresAt };
}

export async function activateTeamAccount(input: { email: string; code: string; password: string }): Promise<void> {
  await invokeTeamAccess({ action: 'activate', ...input, email: input.email.trim() });
}
