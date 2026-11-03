'use client';

import { useEffect, useState } from 'react';
import { Megaphone, Pin } from 'lucide-react';
import { api } from '@/lib/api';
import type { Notice } from '@/types';
import { EmptyState } from '@/components/ui/console';
import { cn, formatRelativeTime } from '@/lib/utils';

const PRIORITY_STYLES: Record<Notice['priority'], string> = {
  URGENT: 'bg-rose-100 text-rose-700',
  IMPORTANT: 'bg-signal-100 text-signal-800',
  NORMAL: 'bg-ink-100 text-ink-500',
};

/** Shared notice feed for teacher and portal consoles. */
export function NoticeFeed() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.teacher
      .notices()
      .then(({ notices }) => setNotices(notices))
      .catch(() => setNotices([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-ink-100" />
        ))}
      </div>
    );
  }

  if (notices.length === 0) {
    return (
      <EmptyState icon={Megaphone} title="All quiet" hint="School notices will appear here." />
    );
  }

  return (
    <ul className="space-y-3">
      {notices.map((notice) => (
        <li key={notice.id} className="rounded-3xl border border-ink-100 bg-white p-4 shadow-soft">
          <div className="flex flex-wrap items-center gap-2">
            {notice.isPinned && (
              <Pin className="h-4 w-4 rotate-45 text-signal-600" aria-label="Pinned" />
            )}
            <p className="font-semibold text-ink-900">{notice.title}</p>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider',
                PRIORITY_STYLES[notice.priority],
              )}
            >
              {notice.priority}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-ink-400">
              {formatRelativeTime(notice.publishedAt)}
            </span>
          </div>
          <p className="mt-1.5 whitespace-pre-line text-xs leading-5 text-ink-600">{notice.body}</p>
        </li>
      ))}
    </ul>
  );
}
