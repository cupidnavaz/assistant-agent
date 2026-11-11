import { useEffect, useState, type FormEvent } from 'react';
import { ImagePlus, Loader2, Trash2, X } from 'lucide-react';
import BrandMark from '@/components/chat/BrandMark';
import {
  ADMIN_NAME_MAX_CHARS,
  COMPANY_NAME_MAX_CHARS,
  removeCompanyLogo,
  saveAdminDisplayName,
  saveCompanySettings,
  uploadCompanyLogo,
  type CompanySettings,
} from '@/lib/company';

type CompanySettingsDialogProps = {
  company: CompanySettings;
  adminEmail: string;
  adminName: string;
  onClose: () => void;
  onSaved: (saved: { company: CompanySettings; adminName: string }) => void;
};

const INPUT_CLASS =
  'w-full rounded-xl border border-brand-indigo/20 bg-white px-3.5 py-2.5 text-[15px] text-brand-deep placeholder:text-brand-deep/40 focus:border-brand-indigo focus:outline-none focus:ring-2 focus:ring-brand-indigo/30 disabled:opacity-60';

export default function CompanySettingsDialog({
  company,
  adminEmail,
  adminName,
  onClose,
  onSaved,
}: CompanySettingsDialogProps) {
  const [companyName, setCompanyName] = useState(company.company_name);
  const [displayName, setDisplayName] = useState(adminName);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview(null);
      return;
    }
    const url = URL.createObjectURL(logoFile);
    setLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  const currentLogo = removeLogo ? null : company.logo_url;
  const shownLogo = logoPreview ?? currentLogo;

  const handleFileChange = (file: File | undefined) => {
    setError(null);
    if (!file) return;
    setRemoveLogo(false);
    setLogoFile(file);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;

    const cleanName = companyName.trim();
    const cleanAdminName = displayName.trim();
    if (!cleanName) {
      setError('Enter a company name.');
      return;
    }

    setSaving(true);
    setError(null);
    let uploadedUrl: string | null = null;
    try {
      if (logoFile) uploadedUrl = await uploadCompanyLogo(logoFile);
      const nextLogo = uploadedUrl ?? (removeLogo ? null : company.logo_url);

      await saveCompanySettings({ company_name: cleanName, logo_url: nextLogo });
      if (cleanAdminName !== adminName) {
        await saveAdminDisplayName(adminEmail, cleanAdminName);
      }

      if (company.logo_url && company.logo_url !== nextLogo) {
        void removeCompanyLogo(company.logo_url);
      }
      onSaved({ company: { company_name: cleanName, logo_url: nextLogo }, adminName: cleanAdminName });
      onClose();
    } catch (err) {
      if (uploadedUrl) void removeCompanyLogo(uploadedUrl);
      setError(err instanceof Error ? err.message : 'The changes could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fx-fade-in fixed inset-0 z-50 flex items-end justify-center bg-brand-deep/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="company-settings-title"
        className="fx-pop-in max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 font-body text-brand-deep shadow-[0_24px_64px_-16px_rgba(43,26,94,0.4)] sm:max-w-md sm:rounded-3xl sm:p-8"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 id="company-settings-title" className="font-display text-xl font-bold leading-[1.2]">
              Company settings
            </h2>
            <p className="mt-1 text-sm text-brand-deep/70">
              These details appear on your admin dashboard and the website chat.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close settings"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-brand-deep/70 transition hover:bg-brand-lavender focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-indigo disabled:opacity-50"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <span className="mb-2 block text-sm font-medium">Logo</span>
            <div className="flex items-center gap-4">
              <BrandMark logoUrl={shownLogo} />
              <div className="flex flex-col gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-brand-lavender px-3.5 py-2 text-sm font-medium text-brand-indigo transition hover:bg-brand-indigo/15 focus-within:ring-2 focus-within:ring-brand-indigo">
                  <ImagePlus className="size-4" aria-hidden="true" />
                  {shownLogo ? 'Replace logo' : 'Upload logo'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={saving}
                    onChange={(event) => handleFileChange(event.target.files?.[0])}
                    className="sr-only"
                  />
                </label>
                {shownLogo && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setLogoFile(null);
                      setRemoveLogo(true);
                    }}
                    className="inline-flex items-center gap-2 self-start rounded-lg px-2 py-1 text-sm font-medium text-red-700 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 disabled:opacity-50"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    Remove logo
                  </button>
                )}
                <p className="text-xs text-brand-deep/60">PNG, JPEG or WebP, up to 2 MB.</p>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="company-name" className="mb-1 block text-sm font-medium">
              Company name
            </label>
            <input
              id="company-name"
              type="text"
              required
              maxLength={COMPANY_NAME_MAX_CHARS}
              value={companyName}
              disabled={saving}
              onChange={(event) => setCompanyName(event.target.value)}
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label htmlFor="admin-display-name" className="mb-1 block text-sm font-medium">
              Your admin name
            </label>
            <input
              id="admin-display-name"
              type="text"
              maxLength={ADMIN_NAME_MAX_CHARS}
              placeholder="For example, Ada"
              value={displayName}
              disabled={saving}
              onChange={(event) => setDisplayName(event.target.value)}
              className={INPUT_CLASS}
            />
            <p className="mt-1 text-xs text-brand-deep/60">Shown to you on the dashboard. Your sign-in email stays the same.</p>
          </div>

          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-brand-indigo transition hover:bg-brand-lavender focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-indigo disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="fx-btn fx-ring flex items-center justify-center gap-2 rounded-xl bg-brand-deep px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-indigo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 disabled:opacity-70"
            >
              {saving && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              Save changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}