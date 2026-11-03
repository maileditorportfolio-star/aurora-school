'use client';

import { useCallback, useEffect, useState } from 'react';
import { Megaphone, CalendarDays, Plus, Pin, Trash2, Pencil, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import type { Notice, NoticeAudience, SchoolEvent } from '@/types';
import { ConsoleHeader, Panel, EmptyState } from '@/components/ui/console';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { NoticeModals } from '@/components/notices/notice-modals';
import { cn, formatDate } from '@/lib/utils';

type Tab = 'notices' | 'events';

const PRIORITY_STYLES: Record<Notice['priority'], string> = {
  URGENT: 'bg-rose-100 text-rose-700',
  IMPORTANT: 'bg-signal-100 text-signal-800',
  NORMAL: 'bg-ink-100 text-ink-500',
};

const AUDIENCES: NoticeAudience[] = ['ALL', 'STUDENTS', 'PARENTS', 'TEACHERS', 'STAFF'];

const emptyNotice = {
  title: '',
  body: '',
  audience: 'ALL' as NoticeAudience,
  priority: 'NORMAL' as Notice['priority'],
  isPinned: false,
  expiresAt: '',
};
const emptyEvent = {
  title: '',
  description: '',
  startAt: '',
  endAt: '',
  location: '',
  audience: 'ALL' as NoticeAudience,
};

export default function NoticesAdminPage() {
  const [tab, setTab] = useState<Tab>('notices');
  const [notices, setNotices] = useState<Notice[]>([]);
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [noticeFormOpen, setNoticeFormOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [noticeForm, setNoticeForm] = useState(emptyNotice);

  const [eventFormOpen, setEventFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<SchoolEvent | null>(null);
  const [eventForm, setEventForm] = useState(emptyEvent);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.allSettled([api.noticesAdmin.list(), api.eventsAdmin.list()]).then(([n, e]) => {
      if (n.status === 'fulfilled') setNotices(n.value.notices);
      if (e.status === 'fulfilled') setEvents(e.value.events);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  const act = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That action failed');
    }
  };

  const openNotice = (notice?: Notice) => {
    setEditingNotice(notice ?? null);
    setNoticeForm(
      notice
        ? {
            title: notice.title,
            body: notice.body,
            audience: notice.audience,
            priority: notice.priority,
            isPinned: notice.isPinned,
            expiresAt: notice.expiresAt ? notice.expiresAt.slice(0, 10) : '',
          }
        : emptyNotice,
    );
    setNoticeFormOpen(true);
  };

  const saveNotice = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const payload = {
      ...noticeForm,
      title: noticeForm.title.trim(),
      body: noticeForm.body.trim(),
      expiresAt: noticeForm.expiresAt || null,
    };
    try {
      if (editingNotice) await api.noticesAdmin.update(editingNotice.id, payload);
      else await api.noticesAdmin.create(payload);
      setNoticeFormOpen(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the notice');
    } finally {
      setSaving(false);
    }
  };

  const openEvent = (item?: SchoolEvent) => {
    setEditingEvent(item ?? null);
    setEventForm(
      item
        ? {
            title: item.title,
            description: item.description ?? '',
            startAt: item.startAt ? item.startAt.slice(0, 16) : '',
            endAt: item.endAt ? item.endAt.slice(0, 16) : '',
            location: item.location ?? '',
            audience: item.audience,
          }
        : emptyEvent,
    );
    setEventFormOpen(true);
  };

  const saveEvent = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const payload = {
      ...eventForm,
      title: eventForm.title.trim(),
      description: eventForm.description.trim() || null,
      startAt: eventForm.startAt,
      endAt: eventForm.endAt || null,
      location: eventForm.location.trim() || null,
    };
    try {
      if (editingEvent) await api.eventsAdmin.update(editingEvent.id, payload);
      else await api.eventsAdmin.create(payload);
      setEventFormOpen(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the event');
    } finally {
      setSaving(false);
    }
  };

  const ctx = {
    noticeFormOpen,
    setNoticeFormOpen,
    editingNotice,
    noticeForm,
    setNoticeForm,
    saveNotice,
    saving,
    eventFormOpen,
    setEventFormOpen,
    editingEvent,
    eventForm,
    setEventForm,
    saveEvent,
  };

  return (
    <>
      <ConsoleHeader
        title="Notices & events"
        description="Publish to the notice board and calendar. Pinned notices stay on top; urgent ones are flagged everywhere."
        actions={
          tab === 'notices' ? (
            <Button size="sm" onClick={() => openNotice()}>
              <Plus className="h-4 w-4" />
              New notice
            </Button>
          ) : (
            <Button size="sm" onClick={() => openEvent()}>
              <Plus className="h-4 w-4" />
              New event
            </Button>
          )
        }
      />

      <div className="space-y-5 p-5 sm:p-8">
        <div
          className="flex gap-1 rounded-2xl border border-ink-100 bg-white p-1 shadow-soft sm:inline-flex"
          role="tablist"
          aria-label="Notices or events"
        >
          {(
            [
              { id: 'notices', label: `Notices (${notices.length})` },
              { id: 'events', label: `Events (${events.length})` },
            ] as Array<{ id: Tab; label: string }>
          ).map((item) => (
            <button
              key={item.id}
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={cn(
                'rounded-xl px-4 py-2 text-xs font-semibold transition',
                tab === item.id ? 'bg-brand-700 text-white' : 'text-ink-500 hover:text-brand-800',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {error && (
          <p
            role="alert"
            className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-medium text-rose-700"
          >
            <AlertCircle className="h-4 w-4" aria-hidden />
            {error}
          </p>
        )}

        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-3xl bg-ink-100" />
            ))}
          </div>
        ) : tab === 'notices' ? (
          notices.length === 0 ? (
            <EmptyState
              icon={Megaphone}
              title="No notices yet"
              hint="Publish the first notice — families see it instantly."
              action={
                <Button size="sm" onClick={() => openNotice()}>
                  <Plus className="h-4 w-4" />
                  New notice
                </Button>
              }
            />
          ) : (
            <ul className="space-y-3">
              {notices.map((notice) => (
                <li
                  key={notice.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-3xl border border-ink-100 bg-white p-4 shadow-soft"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {notice.isPinned && (
                        <Pin className="h-4 w-4 rotate-45 text-signal-600" aria-label="Pinned" />
                      )}
                      <p className="font-semibold text-ink-900">{notice.title}</p>
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
                    <p className="mt-1.5 line-clamp-2 whitespace-pre-line text-xs leading-5 text-ink-500">
                      {notice.body}
                    </p>
                    <p className="mt-1.5 text-[10px] uppercase tracking-wider text-ink-400">
                      {formatDate(notice.publishedAt)}
                      {notice.expiresAt ? ` · expires ${formatDate(notice.expiresAt)}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => openNotice(notice)}
                      aria-label="Edit notice"
                      className="grid h-9 w-9 place-items-center rounded-xl text-ink-400 transition hover:bg-brand-50 hover:text-brand-700"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Delete this notice?'))
                          act(() => api.noticesAdmin.remove(notice.id));
                      }}
                      aria-label="Delete notice"
                      className="grid h-9 w-9 place-items-center rounded-xl text-ink-400 transition hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : events.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No events yet"
            hint="Sports day, science fair, book fair — add them here."
            action={
              <Button size="sm" onClick={() => openEvent()}>
                <Plus className="h-4 w-4" />
                New event
              </Button>
            }
          />
        ) : (
          <ul className="space-y-3">
            {events.map((event) => (
              <li
                key={event.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-ink-100 bg-white p-4 shadow-soft"
              >
                <div className="flex items-center gap-4">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-800 text-center text-white">
                    <div>
                      <p className="font-display text-lg leading-none">
                        {new Date(event.startAt).getDate()}
                      </p>
                      <p className="text-[9px] font-bold uppercase text-brand-200">
                        {new Date(event.startAt).toLocaleString('en', { month: 'short' })}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-ink-900">{event.title}</p>
                    <p className="text-[11px] text-ink-400">
                      {new Date(event.startAt).toLocaleString('en-GB', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                      {event.location ? ` · ${event.location}` : ''} · {event.audience}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => openEvent(event)}
                    aria-label="Edit event"
                    className="grid h-9 w-9 place-items-center rounded-xl text-ink-400 transition hover:bg-brand-50 hover:text-brand-700"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Delete this event?'))
                        act(() => api.eventsAdmin.remove(event.id));
                    }}
                    aria-label="Delete event"
                    className="grid h-9 w-9 place-items-center rounded-xl text-ink-400 transition hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <NoticeModals ctx={ctx} />
    </>
  );
}
