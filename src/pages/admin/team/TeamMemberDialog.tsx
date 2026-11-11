import { useState, type FormEvent } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from '@/components/ui/fieldStyles';
import {
  addTeamMember,
  deleteTeamMember,
  TEAM_PERMISSIONS,
  TEAM_PERMISSION_LABELS,
  updateTeamMember,
  type TeamMember,
  type TeamPermission,
} from '@/lib/team';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENERIC_ERROR = 'Something went wrong. Please try again.';

type TeamMemberDialogProps = {
  member: TeamMember | null;
  onClose: () => void;
  onChanged: () => void;
};

export default function TeamMemberDialog({ member, onClose, onChanged }: TeamMemberDialogProps) {
  const isEdit = member !== null;
  const [email, setEmail] = useState(member?.email ?? '');
  const [name, setName] = useState(member?.name ?? '');
  const [permissions, setPermissions] = useState<TeamPermission[]>(member?.permissions ?? ['leads:view']);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const togglePermission = (permission: TeamPermission) => {
    setPermissions((current) =>
      current.includes(permission) ? current.filter((value) => value !== permission) : [...current, permission],
    );
  };

  const runAction = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      onChanged();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : GENERIC_ERROR);
      setBusy(false);
    }
  };

  const orderedPermissions = () => TEAM_PERMISSIONS.filter((value) => permissions.includes(value));

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    if (!isEdit && !EMAIL_PATTERN.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    if (!name.trim()) {
      setError('Enter the team member name.');
      return;
    }
    if (member) {
      void runAction(() => updateTeamMember(member.id, { name, permissions: orderedPermissions() }));
    } else {
      void runAction(() => addTeamMember({ email, name, permissions: orderedPermissions() }));
    }
  };

  const handleDelete = () => {
    if (!member || busy) return;
    if (!window.confirm(`Remove ${member.email} from the team? They will lose access to the team dashboard.`)) return;
    void runAction(() => deleteTeamMember(member.id));
  };

  return (
    <Modal
      title={isEdit ? 'Edit team member' : 'Add team member'}
      description={
        isEdit
          ? member.email
          : 'Team members can only sign in after you approve them and share an activation code.'
      }
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {!isEdit && (
          <div>
            <label htmlFor="team-email" className="mb-1 block text-sm font-medium">Email</label>
            <input
              id="team-email"
              type="email"
              required
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
        )}
        <div>
          <label htmlFor="team-name" className="mb-1 block text-sm font-medium">Name</label>
          <input
            id="team-name"
            required
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">Permissions</legend>
          <div className="space-y-2">
            {TEAM_PERMISSIONS.map((permission) => {
              const checked = permissions.includes(permission);
              return (
                <label
                  key={permission}
                  className={`fx-neon flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                    checked
                      ? 'border-brand-indigo bg-brand-lavender/60'
                      : 'border-brand-indigo/15 hover:border-brand-indigo/40 hover:bg-brand-lavender/40'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => togglePermission(permission)}
                    className="mt-0.5 size-4 accent-brand-indigo"
                  />
                  <span>
                    <span className="block text-sm font-semibold">{TEAM_PERMISSION_LABELS[permission].label}</span>
                    <span className="block text-xs text-brand-deep/70">{TEAM_PERMISSION_LABELS[permission].description}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
          {isEdit ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className="flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:opacity-60"
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Remove member
            </button>
          ) : (
            <span />
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <button type="button" onClick={onClose} className={`${SECONDARY_BUTTON_CLASS} fx-btn`}>Cancel</button>
            <button type="submit" disabled={busy} className={`${PRIMARY_BUTTON_CLASS} fx-btn fx-ring`}>
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {isEdit ? 'Save changes' : 'Add member'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}