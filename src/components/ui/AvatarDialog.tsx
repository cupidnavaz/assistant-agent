import { useEffect, useState, type ChangeEvent } from 'react';
import { Camera } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import { PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from '@/components/ui/fieldStyles';
import { uploadAvatar } from '@/lib/avatars';

type AvatarDialogProps = {
  name: string;
  currentUrl: string | null;
  onSave: (avatarUrl: string) => Promise<void>;
  onClose: () => void;
};

const ACCEPTED_TYPES = 'image/png,image/jpeg,image/webp';

export default function AvatarDialog({ name, currentUrl, onSave, onClose }: AvatarDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setError(null);
    setFile(selected);
  };

  const handleSave = async () => {
    if (!file) return;
    setIsSaving(true);
    setError(null);
    try {
      const url = await uploadAvatar(file);
      await onSave(url);
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'The photo could not be saved.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal title="Profile photo" description="PNG, JPEG or WebP, up to 2 MB." onClose={onClose}>
      <div className="flex flex-col items-center gap-5">
        <div className="relative">
          {previewUrl ? (
            <img src={previewUrl} alt={`${name} new photo preview`} className="fx-pop-in size-20 rounded-full object-cover ring-2 ring-white" />
          ) : (
            <Avatar name={name} url={currentUrl} size="lg" />
          )}
          <label className="absolute -bottom-1 -right-1 flex size-9 cursor-pointer items-center justify-center rounded-full bg-brand-orange text-white shadow-lg transition hover:scale-110 focus-within:ring-2 focus-within:ring-brand-indigo">
            <Camera className="size-4" aria-hidden="true" />
            <span className="sr-only">Choose a photo</span>
            <input type="file" accept={ACCEPTED_TYPES} onChange={handleFileChange} disabled={isSaving} className="sr-only" />
          </label>
        </div>
        {file && <p className="max-w-full truncate text-sm text-brand-deep/70">{file.name}</p>}
        {error && (
          <p role="alert" className="w-full rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="flex w-full gap-3">
          <button type="button" onClick={onClose} disabled={isSaving} className={SECONDARY_BUTTON_CLASS}>
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={!file || isSaving} className={`${PRIMARY_BUTTON_CLASS} flex-1`}>
            {isSaving ? 'Saving...' : 'Save photo'}
          </button>
        </div>
      </div>
    </Modal>
  );
}