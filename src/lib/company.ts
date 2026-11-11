import { supabase } from '@/lib/supabase';

export const DEFAULT_COMPANY_NAME = 'CupidCreativeX';
export const COMPANY_NAME_MAX_CHARS = 80;
export const ADMIN_NAME_MAX_CHARS = 60;

const LOGO_BUCKET = 'company-assets';
const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const LOGO_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

const LOAD_ERROR = 'The company details could not be loaded. Please try again.';
const SAVE_ERROR = 'The company details could not be saved. Please try again.';

export type CompanySettings = {
  company_name: string;
  logo_url: string | null;
};

function isCompanySettings(value: unknown): value is CompanySettings {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.company_name === 'string' &&
    (row.logo_url === null || typeof row.logo_url === 'string')
  );
}

export async function fetchCompanySettings(): Promise<CompanySettings> {
  const { data, error } = await supabase
    .from('company_settings')
    .select('company_name, logo_url')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw new Error(LOAD_ERROR);
  if (!isCompanySettings(data)) throw new Error(LOAD_ERROR);
  return data;
}

export async function saveCompanySettings(settings: CompanySettings): Promise<void> {
  const { data, error } = await supabase
    .from('company_settings')
    .update({ company_name: settings.company_name, logo_url: settings.logo_url })
    .eq('id', 1)
    .select('id');
  if (error) throw new Error(SAVE_ERROR);
  if (!data || data.length === 0) throw new Error(SAVE_ERROR);
}

export async function fetchAdminDisplayName(email: string): Promise<string> {
  const { data, error } = await supabase
    .from('admin_emails')
    .select('display_name')
    .eq('email', email)
    .maybeSingle();
  if (error) throw new Error(LOAD_ERROR);
  if (!data || typeof data.display_name !== 'string') throw new Error(LOAD_ERROR);
  return data.display_name;
}

export async function saveAdminDisplayName(email: string, displayName: string): Promise<void> {
  const { data, error } = await supabase
    .from('admin_emails')
    .update({ display_name: displayName })
    .eq('email', email)
    .select('email');
  if (error) throw new Error(SAVE_ERROR);
  if (!data || data.length === 0) throw new Error(SAVE_ERROR);
}

export async function uploadCompanyLogo(file: File): Promise<string> {
  const extension = LOGO_EXTENSIONS[file.type];
  if (!extension || file.size > LOGO_MAX_BYTES) {
    throw new Error('The logo must be a PNG, JPEG or WebP image under 2 MB.');
  }
  const path = `logo-${Date.now()}.${extension}`;
  const { error } = await supabase.storage
    .from(LOGO_BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: '3600' });
  if (error) throw new Error('The logo could not be uploaded. Please try again.');
  return supabase.storage.from(LOGO_BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function removeCompanyLogo(url: string): Promise<void> {
  const marker = `/${LOGO_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return;
  const path = decodeURIComponent(url.slice(index + marker.length).split('?')[0]);
  await supabase.storage.from(LOGO_BUCKET).remove([path]);
}
