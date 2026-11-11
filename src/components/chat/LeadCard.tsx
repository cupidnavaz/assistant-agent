import { useId, useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { CHAT_SERVICES, MAX_INPUT_CHARS } from './chatConfig';
import type { LeadPayload } from './chatApi';

type LeadCardProps = {
  submitted: boolean;
  onSubmit: (lead: LeadPayload) => Promise<void>;
};

type LeadErrors = Partial<Record<keyof LeadPayload, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9\s()-]{7,20}$/;

const EMPTY_FORM: LeadPayload = { name: '', contact: '', service: '', project_description: '' };

function validate(form: LeadPayload): LeadErrors {
  const errors: LeadErrors = {};
  if (!form.name.trim()) errors.name = 'Please tell us your name.';
  const contact = form.contact.trim();
  if (!contact) errors.contact = 'Add an email address or phone number.';
  else if (!EMAIL_PATTERN.test(contact) && !PHONE_PATTERN.test(contact)) {
    errors.contact = 'Enter a valid email address or phone number.';
  }
  if (!form.service) errors.service = 'Choose the service you need.';
  if (!form.project_description.trim()) errors.project_description = 'Share a few words about your project.';
  return errors;
}

const FIELD_CLASS =
  'w-full rounded-xl border bg-white px-3 py-2.5 text-[15px] text-brand-deep placeholder:text-brand-deep/40 transition duration-300 focus:outline-none focus:ring-2 focus:ring-brand-indigo/40 focus:shadow-[0_0_24px_-8px] focus:shadow-brand-indigo/50';

function fieldClass(hasError: boolean) {
  return `${FIELD_CLASS} ${hasError ? 'border-red-500' : 'border-brand-indigo/20 focus:border-brand-indigo'}`;
}

function SuccessState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      className="flex flex-col items-center gap-3 py-4 text-center"
      role="status"
    >
      <svg viewBox="0 0 48 48" className="size-14" aria-hidden="true">
        <motion.circle
          cx="24"
          cy="24"
          r="22"
          fill="none"
          stroke="#FF6A00"
          strokeWidth="3"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
        <motion.path
          d="M14 25 L21 32 L34 17"
          fill="none"
          stroke="#2B1A5E"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, delay: 0.5, ease: 'easeOut' }}
        />
      </svg>
      <p className="font-display text-lg font-semibold text-brand-deep">Details received</p>
      <p className="text-sm text-brand-deep/70">Our team will follow up with you soon.</p>
    </motion.div>
  );
}

export default function LeadCard({ submitted, onSubmit }: LeadCardProps) {
  const id = useId();
  const [form, setForm] = useState<LeadPayload>(EMPTY_FORM);
  const [errors, setErrors] = useState<LeadErrors>({});
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [serverError, setServerError] = useState<string | null>(null);

  if (submitted) {
    return (
      <div className="fx-neon ml-10 rounded-2xl border border-brand-indigo/15 bg-white p-4 shadow-sm">
        <SuccessState />
      </div>
    );
  }

  const update = (field: keyof LeadPayload, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === 'submitting') return;
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setStatus('submitting');
    setServerError(null);
    try {
      await onSubmit({
        name: form.name.trim(),
        contact: form.contact.trim(),
        service: form.service,
        project_description: form.project_description.trim(),
      });
    } catch (err) {
      setStatus('error');
      setServerError(err instanceof Error ? err.message : 'We could not save your details. Please try again.');
    }
  };

  const isSubmitting = status === 'submitting';

  return (
    <div className="fx-pop-in fx-neon ml-10 rounded-2xl border border-brand-indigo/15 bg-white p-4 shadow-md shadow-brand-deep/5">
      <div className="mb-3">
        <p className="fx-text-gradient font-display text-lg font-semibold text-brand-deep">Tell us about your project</p>
        <p className="text-sm text-brand-deep/70">Takes under a minute. We reply with a tailored quote.</p>
      </div>

      <form noValidate onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor={`${id}-name`} className="mb-1 block text-sm font-medium text-brand-deep">
            Full name
          </label>
          <input
            id={`${id}-name`}
            type="text"
            autoComplete="name"
            maxLength={100}
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? `${id}-name-error` : undefined}
            className={fieldClass(Boolean(errors.name))}
          />
          {errors.name && (
            <p id={`${id}-name-error`} className="mt-1 text-xs text-red-600">
              {errors.name}
            </p>
          )}
        </div>

        <div>
          <label htmlFor={`${id}-contact`} className="mb-1 block text-sm font-medium text-brand-deep">
            Email or phone
          </label>
          <input
            id={`${id}-contact`}
            type="text"
            inputMode="email"
            autoComplete="email"
            maxLength={200}
            value={form.contact}
            onChange={(e) => update('contact', e.target.value)}
            aria-invalid={Boolean(errors.contact)}
            aria-describedby={errors.contact ? `${id}-contact-error` : undefined}
            className={fieldClass(Boolean(errors.contact))}
          />
          {errors.contact && (
            <p id={`${id}-contact-error`} className="mt-1 text-xs text-red-600">
              {errors.contact}
            </p>
          )}
        </div>

        <div>
          <label htmlFor={`${id}-service`} className="mb-1 block text-sm font-medium text-brand-deep">
            Service needed
          </label>
          <select
            id={`${id}-service`}
            value={form.service}
            onChange={(e) => update('service', e.target.value)}
            aria-invalid={Boolean(errors.service)}
            aria-describedby={errors.service ? `${id}-service-error` : undefined}
            className={fieldClass(Boolean(errors.service))}
          >
            <option value="">Select a service</option>
            {CHAT_SERVICES.map((service) => (
              <option key={service} value={service}>
                {service}
              </option>
            ))}
          </select>
          {errors.service && (
            <p id={`${id}-service-error`} className="mt-1 text-xs text-red-600">
              {errors.service}
            </p>
          )}
        </div>

        <div>
          <label htmlFor={`${id}-description`} className="mb-1 block text-sm font-medium text-brand-deep">
            Project description
          </label>
          <textarea
            id={`${id}-description`}
            rows={3}
            maxLength={MAX_INPUT_CHARS}
            value={form.project_description}
            onChange={(e) => update('project_description', e.target.value)}
            aria-invalid={Boolean(errors.project_description)}
            aria-describedby={errors.project_description ? `${id}-description-error` : undefined}
            className={`${fieldClass(Boolean(errors.project_description))} resize-none`}
          />
          {errors.project_description && (
            <p id={`${id}-description-error`} className="mt-1 text-xs text-red-600">
              {errors.project_description}
            </p>
          )}
        </div>

        {status === 'error' && serverError && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
            {serverError}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="fx-btn fx-ring flex w-full items-center justify-center gap-2 rounded-xl bg-brand-orange px-4 py-2.5 text-sm font-semibold text-brand-deep shadow-md shadow-brand-orange/30 transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-indigo focus-visible:ring-offset-2 disabled:opacity-70"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Sending
            </>
          ) : (
            <>
              <CheckCircle2 className="size-4" aria-hidden="true" />
              Send my details
            </>
          )}
        </button>
      </form>
    </div>
  );
}