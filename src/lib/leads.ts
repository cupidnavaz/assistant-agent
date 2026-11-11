import { supabase } from '@/lib/supabase';

export const LEAD_STATUSES = ['new', 'contacted', 'won', 'lost'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  won: 'Won',
  lost: 'Lost',
};

export type Lead = {
  id: string;
  name: string;
  contact: string;
  service: string;
  project_description: string;
  source: string;
  status: LeadStatus;
  created_at: string;
};

const LEAD_COLUMNS = 'id, name, contact, service, project_description, source, status, created_at';

function isLead(value: unknown): value is Lead {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === 'string' &&
    typeof row.name === 'string' &&
    typeof row.contact === 'string' &&
    typeof row.service === 'string' &&
    typeof row.project_description === 'string' &&
    typeof row.source === 'string' &&
    typeof row.created_at === 'string' &&
    LEAD_STATUSES.includes(row.status as LeadStatus)
  );
}

export async function fetchLeads(): Promise<Lead[]> {
  const { data, error } = await supabase
    .from('leads')
    .select(LEAD_COLUMNS)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  if (!Array.isArray(data) || !data.every(isLead)) {
    throw new Error('The leads could not be read. Please refresh the page.');
  }
  return data;
}

export async function updateLeadStatus(id: string, status: LeadStatus): Promise<void> {
  const { data, error } = await supabase
    .from('leads')
    .update({ status })
    .eq('id', id)
    .select('id');
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error('This lead could not be updated.');
}

export type LeadInput = {
  name: string;
  contact: string;
  service: string;
  project_description: string;
  status: LeadStatus;
};

const LEAD_SAVE_ERROR = 'The lead could not be saved. Check your permissions and try again.';

export async function createLead(input: LeadInput): Promise<void> {
  const { data, error } = await supabase
    .from('leads')
    .insert({ ...input, source: 'dashboard' })
    .select('id');
  if (error || !data || data.length === 0) throw new Error(LEAD_SAVE_ERROR);
}

export async function updateLead(id: string, input: LeadInput): Promise<void> {
  const { data, error } = await supabase.from('leads').update(input).eq('id', id).select('id');
  if (error || !data || data.length === 0) throw new Error(LEAD_SAVE_ERROR);
}

export async function deleteLead(id: string): Promise<void> {
  const { data, error } = await supabase.from('leads').delete().eq('id', id).select('id');
  if (error || !data || data.length === 0) throw new Error('The lead could not be deleted. Please try again.');
}

function csvCell(value: string): string {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function leadsToCsv(leads: Lead[]): string {
  const header = ['Received', 'Name', 'Contact', 'Service', 'Project description', 'Source', 'Status'];
  const rows = leads.map((lead) =>
    [
      new Date(lead.created_at).toISOString(),
      lead.name,
      lead.contact,
      lead.service,
      lead.project_description,
      lead.source,
      lead.status,
    ].map(csvCell).join(','),
  );
  return [header.map(csvCell).join(','), ...rows].join('\r\n');
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
