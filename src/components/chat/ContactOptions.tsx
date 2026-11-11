import { motion, useReducedMotion } from 'framer-motion';
import { Mail, MessageCircle, Phone, Send, type LucideIcon } from 'lucide-react';
import { CONTACT_EMAIL, CONTACT_PHONES, CONTACT_TELEGRAM, CONTACT_WHATSAPP } from './chatConfig';

type ContactOption = { key: string; label: string; detail: string; href: string; icon: LucideIcon };

const OPTIONS: ContactOption[] = [
  ...CONTACT_PHONES.map((phone) => ({
    key: `call-${phone}`,
    label: 'Call',
    detail: phone,
    href: `tel:${phone}`,
    icon: Phone,
  })),
  ...(CONTACT_WHATSAPP
    ? [{ key: 'whatsapp', label: 'WhatsApp', detail: 'Chat on WhatsApp', href: `https://wa.me/${CONTACT_WHATSAPP}`, icon: MessageCircle }]
    : []),
  ...(CONTACT_TELEGRAM
    ? [{ key: 'telegram', label: 'Telegram', detail: `@${CONTACT_TELEGRAM}`, href: `https://t.me/${CONTACT_TELEGRAM}`, icon: Send }]
    : []),
  { key: 'email', label: 'Email', detail: CONTACT_EMAIL, href: `mailto:${CONTACT_EMAIL}`, icon: Mail },
];

export default function ContactOptions() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="space-y-3 px-5 py-4 text-sm text-brand-deep">
      <p className="font-medium">Prefer to speak with someone? Reach the team directly:</p>
      <ul className="grid gap-2">
        {OPTIONS.map((option, index) => {
          const Icon = option.icon;
          const external = option.href.startsWith('https://');
          return (
            <motion.li
              key={option.key}
              initial={reduceMotion ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: reduceMotion ? 0 : index * 0.05, duration: 0.25 }}
            >
              <a
                href={option.href}
                target={external ? '_blank' : undefined}
                rel={external ? 'noopener noreferrer' : undefined}
                className="fx-neon group flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-brand-indigo/10 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-brand-indigo/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-indigo"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-lavender text-brand-indigo transition-transform duration-300 group-hover:scale-110">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-brand-deep/60">{option.label}</span>
                  <span className="block truncate font-medium text-brand-indigo group-hover:text-brand-deep">{option.detail}</span>
                </span>
              </a>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}