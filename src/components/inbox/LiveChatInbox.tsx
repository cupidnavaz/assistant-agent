import { MessagesSquare } from 'lucide-react';
import LiveChatThread from './LiveChatThread';
import { useTeamInbox } from './useTeamInbox';

export default function LiveChatInbox() {
  const inbox = useTeamInbox();
  const selected = inbox.conversations.find((conversation) => conversation.id === inbox.selectedId) ?? null;

  return (
    <section
      aria-labelledby="live-chat-inbox-title"
      className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0d0d16]/90 backdrop-blur-xl shadow-2xl transition-all duration-500 hover:-translate-y-1 hover:border-[#f97316]/40 hover:shadow-[0_15px_35px_-5px_rgba(249,115,22,0.25)]"
    >
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center_top,rgba(6,182,212,0.1),transparent_75%)] opacity-70" />

      <div className="relative flex flex-col md:h-[600px] md:flex-row">
        <aside
          className={`${selected ? 'hidden md:flex' : 'flex'} w-full flex-col border-white/10 md:w-80 md:border-r bg-black/20`}
        >
          <div className="flex items-center gap-2 border-b border-white/10 px-6 py-4">
            <MessagesSquare className="size-5 text-[#f97316]" aria-hidden="true" />
            <h2 id="live-chat-inbox-title" className="font-display text-lg font-semibold leading-[1.2] text-white tracking-wide">
              Live chat
            </h2>
          </div>
          <ul className="max-h-[420px] flex-1 divide-y divide-white/5 overflow-y-auto md:max-h-none">
            {inbox.conversations.map((conversation) => {
              const active = conversation.id === inbox.selectedId;
              return (
                <li key={conversation.id}>
                  <button
                    type="button"
                    onClick={() => inbox.selectConversation(conversation.id)}
                    aria-current={active ? 'true' : undefined}
                    className={`group relative flex w-full flex-col gap-1 px-6 py-4 text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316] ${
                      active
                        ? 'bg-[#f97316]/15 border-l-4 border-[#f97316]'
                        : 'hover:bg-white/5 hover:translate-x-1'
                    }`}
                  >
                    <span className={`text-sm font-semibold transition-colors ${active ? 'text-[#f97316]' : 'text-gray-200 group-hover:text-white'}`}>
                      {conversation.visitor_name} {conversation.id.slice(0, 6).toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-400">
                      Last message {new Date(conversation.last_message_at).toLocaleString()}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {inbox.isListLoaded && inbox.conversations.length === 0 && (
            <p className="px-6 py-6 text-sm leading-[1.5] text-gray-400">
              No live chats yet. Visitors who choose "Chat live with our team" will appear here.
            </p>
          )}
        </aside>

        <div className={`${selected ? 'flex' : 'hidden md:flex'} min-h-[420px] min-w-0 flex-1 flex-col md:min-h-0 bg-[#0a0a0f]/50`}>
          {selected ? (
            <LiveChatThread
              conversation={selected}
              messages={inbox.messages}
              isRemoteTyping={inbox.isRemoteTyping}
              error={inbox.error}
              isSending={inbox.isSending}
              onBack={() => inbox.selectConversation(null)}
              onSend={inbox.sendText}
              onAttach={(file) => void inbox.sendFile(file)}
              onTyping={inbox.notifyTyping}
              onRetry={() => void inbox.retry()}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-gray-400">
              Select a conversation to read and reply.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}