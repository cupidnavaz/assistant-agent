import { supabase } from '@/lib/supabase';

const AVATAR_BUCKET = 'avatars';
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const AVATAR_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

const SAVE_ERROR = 'The photo could not be saved. Please try again.';
const LOAD_ERROR = 'The photo could not be loaded. Please try again.';

export async function uploadAvatar(file: File): Promise<string> {
  const extension = AVATAR_EXTENSIONS[file.type];
  if (!extension || file.size > AVATAR_MAX_BYTES) {
    throw new Error('The photo must be a PNG, JPEG or WebP image under 2 MB.');
  }
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const userId = sessionError ? null : sessionData.session?.user.id;
  if (!userId) throw new Error('Sign in again to change your photo.');

  const path = `${userId}/avatar-${Date.now()}.${extension}`;
  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: '3600' });
  if (error) throw new Error('The photo could not be uploaded. Please try again.');
  return supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function fetchAdminAvatar(email: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('admin_emails')
    .select('avatar_url')
    .eq('email', email)
    .maybeSingle();
  if (error) throw new Error(LOAD_ERROR);
  if (!data || (data.avatar_url !== null && typeof data.avatar_url !== 'string')) throw new Error(LOAD_ERROR);
  return data.avatar_url;
}

export async function saveAdminAvatar(email: string, avatarUrl: string): Promise<void> {
  const { data, error } = await supabase
    .from('admin_emails')
    .update({ avatar_url: avatarUrl })
    .eq('email', email)
    .select('email');
  if (error || !data || data.length === 0) throw new Error(SAVE_ERROR);
}

export async function saveTeamAvatar(memberId: string, avatarUrl: string): Promise<void> {
  const { data, error } = await supabase
    .from('team_members')
    .update({ avatar_url: avatarUrl })
    .eq('id', memberId)
    .select('id');
  if (error || !data || data.length === 0) throw new Error(SAVE_ERROR);
}
