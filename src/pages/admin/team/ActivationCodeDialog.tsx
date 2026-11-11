import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from '@/components/ui/fieldStyles';
import type { ActivationCode, TeamMember } from '@/lib/team';

type ActivationCodeDialogProps = {
  member: TeamMember;
  issued: ActivationCode;
  onClose: () => void;
};

export default function ActivationCodeDialog({ member, issued, onClose }: ActivationCodeDialogProps) {
  const [copied, setCopied] = useState(false);
  const expiresAt = new Date(issued.expiresAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(issued.code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Modal
      title="Activation code ready"
      description={`${member.name || member.email} is approved. Share this code privately.`}
      onClose={onClose}
    >
      <div className="space-y-5">
        <div className="fx-pop-in fx-neon rounded-2xl bg-brand-lavender/60 px-4 py-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-deep/60">One-time code</p>
          <p className="mt-2 select-all font-mono text-3xl font-bold tracking-[0.25em] text-brand-deep">{issued.code}</p>
          <p className="mt-3 text-xs text-brand-deep/70">Expires {expiresAt}</p>
        </div>
        <p className="text-sm leading-[1.5] text-brand-deep/80">
          The member enters this code on the team sign-in page along with their email, then chooses their own
          password. The code is shown only once. If it is lost, approve the member again to issue a new code.
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => void copyCode()} className={`${SECONDARY_BUTTON_CLASS} fx-btn`}>
            {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
            {copied ? 'Copied' : 'Copy code'}
          </button>
          <button type="button" onClick={onClose} className={`${PRIMARY_BUTTON_CLASS} fx-btn fx-ring`}>Done</button>
        </div>
      </div>
    </Modal>
  );
}