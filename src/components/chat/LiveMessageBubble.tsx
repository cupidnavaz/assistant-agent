import { FileText } from 'lucide-react';
import DeliveryTicks from './DeliveryTicks';
import { attachmentUrl, type LiveChatMessage } from '@/lib/liveChat';

type LiveMessageBubbleProps = {
  message: LiveChatMessage;
  isOwn: boolean;
};

export default function LiveMessageBubble({ message, isOwn }: LiveMessageBubbleProps) {
  const time = new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const isImage = message.attachment_type?.startsWith('image/') ?? false;
  const url = message.attachment_path ? attachmentUrl(message.attachment_path) : null;

  return (
    <div className={`fx-pop-in flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] space-y-2 rounded-2xl px-4 py-2.5 text-[15px] leading-[1.5] shadow-sm transition-shadow duration-300 hover:shadow-[0_0_24px_-4px] hover:shadow-brand-indigo/50 ${
          isOwn
            ? 'rounded-br-md bg-brand-indigo text-white'
            : 'rounded-bl-md border border-brand-indigo/10 bg-white text-brand-deep'
        }`}
      >
        {url && isImage && (
          <a href={url} target="_blank" rel="noopener noreferrer" className="block">
            <img
              src={url}
              alt={message.attachment_name ?? 'Shared image'}
              loading="lazy"
              className="max-h-48 rounded-xl object-cover"
            />
          </a>
        )}
        {url && !isImage && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm underline-offset-2 hover:underline ${
              isOwn ? 'bg-white/10' : 'bg-brand-lavender'
            }`}
          >
            <FileText className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{message.attachment_name ?? 'Attached file'}</span>
          </a>
        )}
        {message.body && <p className="whitespace-pre-wrap break-words">{message.body}</p>}
        <p className={`flex items-center gap-1.5 text-[11px] ${isOwn ? 'justify-end text-white/70' : 'text-brand-deep/60'}`}>
          <time dateTime={message.created_at}>{time}</time>
          {isOwn && <DeliveryTicks status={message.status} />}
        </p>
      </div>
    </div>
  );
}