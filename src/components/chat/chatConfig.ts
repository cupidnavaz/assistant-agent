export const CHAT_SERVICES = [
  'Web & App Development',
  'Generative AI Services',
  'UI/UX Design',
  'Data Analytics & Insights',
  'Graphics Design',
  'Digital Consultation',
  'Digital Marketing',
] as const;

export const CONTACT_PHONES = ['0707988777', '09039454419'] as const;
export const CONTACT_EMAIL = 'info@cupidcreativex.com';
// International digits only, e.g. '2347079887770'. Empty hides the WhatsApp option.
export const CONTACT_WHATSAPP = '';
// Telegram username without the @. Empty hides the Telegram option.
export const CONTACT_TELEGRAM = '';

export const MAX_INPUT_CHARS = 1000;
export const MAX_HISTORY_MESSAGES = 20;
export const CHAT_STORAGE_KEY = 'cupidcreativex-chat-v1';

export type QuickReplyAction =
  | { type: 'send'; label: string; prompt: string }
  | { type: 'lead'; label: string };

export const QUICK_REPLIES: QuickReplyAction[] = [
  { type: 'send', label: 'Our services', prompt: 'What services does CupidCreativeX offer?' },
  { type: 'lead', label: 'Get a quote' },
  { type: 'lead', label: 'Book a project' },
  { type: 'send', label: '20% off first project', prompt: 'Tell me about the 20% off for a first project.' },
];
