'use client';

import { useEffect, useState } from 'react';
import { Megaphone, Pin, CalendarDays, MapPin } from 'lucide-react';
import { api } from '@/lib/api';
import type { Notice, SchoolEvent } from '@/types';
import { EmptyState } from '@/components/ui/console';
import { cn, formatDate } from '@/lib/utils';

const PRIORITY_STYLES: Record<Notice['priority'], string> = {
  URGENT: 'bg-rose-100 text-rose-700',
  IMPORTANT: 'bg-signal-100 text-signal-800',
  NORMAL: 'bg-ink-100 text-ink-500',
};

export default function NoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([api.public.notices(), api.public.events()]).then(([n, e]) => {
      if (n.status === 'fulfilled') setNotices(n.value.notices);
      if (e.status === 'fulfilled') setEvents(e.value.events);
      setLoading(false);
    });
  }, []);

  return (
    <div className="bg-frost">
      <div className="container-page py-12 lg:py-16">
        <div className="max-w-2xl">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-brand-600">
            <Megaphone className="h-4 w-4" aria-hidden />
            School notice board
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold text-brand-950">
            Notices & events
          </h1>
          <p className="mt-2 text-sm leading-6 text-ink-500">
            Official announcements from the school office. Pinned items stay on top; urgent ones are
            called out in red.
          </p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-12">
          {/* Notices */}
          <div className="lg:col-span-7">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((key) => (
                  <div key={key} className="h-24 animate-pulse rounded-3xl bg-ink-100" />
                ))}
              </div>
            ) : notices.length === 0 ? (
              <EmptyState
                icon={Megaphone}
                title="No notices published yet"
                hint="Check back after the next school day."
              />
            ) : (
              <ul className="space-y-4">
                {notices.map((notice) => (
                  <li
                    key={notice.id}
                    className="rounded-3xl border border-ink-100 bg-white p-5 shadow-soft"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      {notice.isPinned && (
                        <Pin className="h-4 w-4 rotate-45 text-signal-600" aria-label="Pinned" />
                      )}
                      <h2 className="font-semibold text-ink-900">{notice.title}</h2>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                          PRIORITY_STYLES[notice.priority],
                        )}
                      >
                        {notice.priority}
                      </span>
                      <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-800">
                        {notice.audience}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink-600">
                      {notice.body}
                    </p>
                    <p className="mt-3 text-[10px] uppercase tracking-wider text-ink-400">
                      {formatDate(notice.publishedAt)}
                      {notice.author?.name ? ` · ${notice.author.name}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Events */}
          <aside className="lg:col-span-5">
            <h2 className="font-display text-xl font-semibold text-brand-950">Upcoming events</h2>
            <div className="mt-4 space-y-3">
              {events.length === 0 && !loading && (
                <EmptyState
                  icon={CalendarDays}
                  title="No events scheduled"
                  hint="Sports day, fairs and meetings will be listed here."
                />
              )}
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex gap-4 rounded-3xl border border-ink-100 bg-white p-4 shadow-soft"
                >
                  <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-brand-800 text-center text-white">
                    <div>
                      <p className="font-display text-xl leading-none">
                        {new Date(event.startAt).getDate()}
                      </p>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-brand-200">
                        {new Date(event.startAt).toLocaleString('en', { month: 'short' })}
                      </p>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-ink-900">{event.title}</p>
                    {event.description && (
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-500">
                        {event.description}
                      </p>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[10px] font-medium text-ink-400">
                      <span>
                        {new Date(event.startAt).toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1 text-brand-700">
                          <MapPin className="h-3 w-3" aria-hidden />
                          {event.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
