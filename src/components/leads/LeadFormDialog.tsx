import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import {
  createLead,
  LEAD_STATUS_LABELS,
  LEAD_STATUSES,
  updateLead,
  type Lead,
  type LeadInput,
  type LeadStatus,
} from '@/lib/leads';

type LeadFormDialogProps = {
  lead: Lead | null;
  onClose: () => void;
  onSaved: () => void;
};

// Custom dark mode field tokens matching CupidCreativeX Modal Spec
const DARK_INPUT_CLASS =
  'w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white placeholder-gray-500 transition-all duration-300 focus:border-[#f97316] focus:outline-none focus:ring-2 focus:ring-[#f97316]/20';
const DARK_PRIMARY_BTN =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-[#f97316] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_20px_-5px_rgba(249,115,22,0.4)] transition-all duration-300 hover:brightness-110 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50';
const DARK_SECONDARY_BTN =
  'inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-gray-300 transition-all duration-300 hover:bg-white/10 hover:text-white hover:-translate-y-0.5';

export default function LeadFormDialog({ lead, onClose, onSaved }: LeadFormDialogProps) {
  const [name, setName] = useState(lead?.name ?? '');
  const [contact, setContact] = useState(lead?.contact ?? '');
  const [service, setService] = useState(lead?.service ?? '');
  const [projectDescription, setProjectDescription] = useState(lead?.project_description ?? '');
  const [status, setStatus] = useState<LeadStatus>(lead?.status ?? 'new');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const input: LeadInput = {
      name: name.trim(),
      contact: contact.trim(),
      service: service.trim(),
      project_description: projectDescription.trim(),
      status,
    };
    if (!input.name || !input.contact || !input.service) {
      setError('Name, contact and service are required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (lead) await updateLead(lead.id, input);
      else await createLead(input);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The lead could not be saved.');
      setBusy(false);
    }
  };

  return (
    <Modal
      title={lead ? 'Edit lead' : 'Add lead'}
      description={lead ? 'Update the details of this enquiry.' : 'Record an enquiry that came in outside the website chat.'}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="lead-name" className="mb-1.5 block text-sm font-medium text-gray-300">Name</label>
          <input id="lead-name" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} className={DARK_INPUT_CLASS} />
        </div>
        <div>
          <label htmlFor="lead-contact" className="mb-1.5 block text-sm font-medium text-gray-300">Contact (email or phone)</label>
          <input id="lead-contact" required maxLength={160} value={contact} onChange={(e) => setContact(e.target.value)} className={DARK_INPUT_CLASS} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="lead-service" className="mb-1.5 block text-sm font-medium text-gray-300">Service</label>
            <input id="lead-service" required maxLength={120} value={service} onChange={(e) => setService(e.target.value)} className={DARK_INPUT_CLASS} />
          </div>
          <div>
            <label htmlFor="lead-status" className="mb-1.5 block text-sm font-medium text-gray-300">Status</label>
            <select id="lead-status" value={status} onChange={(e) => setStatus(e.target.value as LeadStatus)} className={`${DARK_INPUT_CLASS} bg-[#0d0d16]`}>
              {LEAD_STATUSES.map((value) => (
                <option key={value} value={value} className="bg-[#0d0d16] text-white">{LEAD_STATUS_LABELS[value]}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="lead-description" className="mb-1.5 block text-sm font-medium text-gray-300">Project description</label>
          <textarea
            id="lead-description"
            rows={4}
            maxLength={2000}
            value={projectDescription}
            onChange={(e) => setProjectDescription(e.target.value)}
            className={`${DARK_INPUT_CLASS} resize-y`}
          />
        </div>

        {error && (
          <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</p>
        )}

        <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={DARK_SECONDARY_BTN}>Cancel</button>
          <button type="submit" disabled={busy} className={DARK_PRIMARY_BTN}>
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {lead ? 'Save changes' : 'Add lead'}
          </button>
        </div>
      </form>
    </Modal>
  );
}