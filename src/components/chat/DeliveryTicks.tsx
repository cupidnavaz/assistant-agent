import { Check, CheckCheck } from 'lucide-react';
import type { DeliveryStatus } from '@/lib/liveChat';

const LABELS: Record<DeliveryStatus, string> = {
  sent: 'Sent',
  delivered: 'Delivered',
  read: 'Read',
};

export default function DeliveryTicks({ status }: { status: DeliveryStatus }) {
  const Icon = status === 'sent' ? Check : CheckCheck;
  return (
    <span
      role="img"
      aria-label={LABELS[status]}
      title={LABELS[status]}
      className={`inline-flex items-center ${status === 'read' ? 'text-sky-300' : 'text-white/70'}`}
    >
      <Icon className="size-3.5" aria-hidden="true" />
    </span>
  );
}
