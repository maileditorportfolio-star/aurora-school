'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, X, GraduationCap } from 'lucide-react';
import { io, type Socket } from 'socket.io-client';
import { api, getToken, SOCKET_URL } from '@/lib/api';
import type { ChatMessage } from '@/types';
import { useAuthStore } from '@/store/auth';
import { cn, formatRelativeTime } from '@/lib/utils';

const CONVERSATION = 'support';

/**
 * Floating support chat. Messages flow through the Socket.io server, which
 * persists them and broadcasts to the conversation room; history is loaded
 * over REST. If the socket is unreachable, sending falls back to REST.
 */
export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [online, setOnline] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    api.chat
      .history(CONVERSATION)
      .then(({ messages: history }) => {
        if (!cancelled) setMessages(history);
      })
      .catch(() => {
        if (!cancelled) setMessages([]);
      });

    const token = getToken();
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: token ? { token } : undefined,
    });
    socketRef.current = socket;
    socket.on('connect', () => {
      setOnline(true);
      socket.emit('chat:join', { conversationId: CONVERSATION });
    });
    socket.on('disconnect', () => setOnline(false));
    socket.on('chat:message', (payload: { message: ChatMessage }) => {
      const message = payload?.message;
      if (message?.conversationId === CONVERSATION) {
        setMessages((prev) =>
          prev.some((row) => row.id === message.id) ? prev : [...prev, message],
        );
      }
    });

    return () => {
      cancelled = true;
      socket.disconnect();
      socketRef.current = null;
      setOnline(false);
    };
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const send = async () => {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    setDraft('');

    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit('chat:message', { conversationId: CONVERSATION, content });
      setSending(false);
      return;
    }

    try {
      // Offline path: persist over REST, then append locally.
      const { message } = await api.chat.send({ conversationId: CONVERSATION, content });
      setMessages((prev) => [...prev, message]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `local-${Date.now()}`,
          conversationId: CONVERSATION,
          content,
          sender: 'USER',
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? 'Close support chat' : 'Open support chat'}
        className="fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-2xl bg-brand-700 text-white shadow-glow transition hover:scale-105 hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/40"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex w-[92vw] max-w-sm flex-col overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-lift">
          <div className="flex items-center gap-3 border-b border-ink-100 bg-brand-950 px-4 py-3 text-white">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-800">
              <GraduationCap className="h-5 w-5 text-signal-300" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Aurora School Support</p>
              <p className="flex items-center gap-1.5 text-[10px] text-brand-300">
                <span
                  className={cn(
                    'inline-block h-1.5 w-1.5 rounded-full',
                    online ? 'bg-emerald-400' : 'bg-ink-400',
                  )}
                  aria-hidden
                />
                {online ? 'Online — office replies Sun–Thu' : 'Offline — messages still reach us'}
              </p>
            </div>
          </div>

          <div className="h-80 overflow-y-auto px-3 py-3">
            {messages.length === 0 && (
              <p className="mt-8 text-center text-xs leading-6 text-ink-400">
                Ask about admission, fees, transport or results.
                <br />
                We reply within the school day.
              </p>
            )}
            {messages.map((message) => {
              const mine = message.sender !== 'ADMIN' && message.sender !== 'SYSTEM';
              return (
                <div
                  key={message.id}
                  className={cn('mb-2 flex', mine ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[75%] rounded-2xl px-3 py-2 text-xs leading-5',
                      message.sender === 'SYSTEM'
                        ? 'bg-signal-50 italic text-ink-600'
                        : mine
                          ? 'bg-brand-700 text-white'
                          : 'bg-ink-100 text-ink-800',
                    )}
                  >
                    <p>{message.content}</p>
                    <p className={cn('mt-1 text-[9px]', mine ? 'text-brand-200' : 'text-ink-400')}>
                      {formatRelativeTime(message.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <form
            className="flex items-center gap-2 border-t border-ink-100 p-2"
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
          >
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={user ? `Message as ${user.name.split(' ')[0]}…` : 'Type your message…'}
              aria-label="Chat message"
              className="h-10 min-w-0 flex-1 rounded-2xl border border-ink-200 bg-frost px-3 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              aria-label="Send message"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-700 text-white transition hover:bg-brand-600 disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
