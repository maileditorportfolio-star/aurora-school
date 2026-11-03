'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CalendarCheck2,
  ClipboardList,
  CalendarClock,
  Megaphone,
  Users,
  BookOpenCheck,
  ArrowRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { TeacherOverview } from '@/types';
import { ConsoleHeader, Panel, StatCard, EmptyState } from '@/components/ui/console';
import { NoticeFeed } from '@/components/notice-feed';
import { cn } from '@/lib/utils';

export default function TeacherDashboardPage() {
  const [overview, setOverview] = useState<TeacherOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.teacher
      .overview()
      .then(setOverview)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Could not load your overview'),
      );
  }, []);

  const todaySlots = overview?.todaySlots ?? [];
  const dayName = new Date().toLocaleDateString('en-GB', { weekday: 'long' });

  return (
    <>
      <ConsoleHeader
        title={`Good day — ${dayName}`}
        description="Your sections, today’s periods and outstanding register/mark entry."
        actions={
          <Link
            href="/teacher/attendance"
            className="inline-flex items-center gap-2 rounded-full bg-brand-700 px-5 py-2 text-xs font-semibold text-white transition hover:bg-brand-600"
          >
            <CalendarCheck2 className="h-4 w-4" aria-hidden />
            Mark attendance
          </Link>
        }
      />

      <div className="space-y-6 p-5 sm:p-8">
        {error && (
          <p
            role="alert"
            className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          >
            {error}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="My sections"
            value={overview ? overview.sections.length : '—'}
            icon={Users}
            tone="brand"
            hint="You can mark their registers"
          />
          <StatCard
            label="Subject assignments"
            value={overview ? overview.assignments.length : '—'}
            icon={BookOpenCheck}
            tone="ink"
            hint="Class-wide or section-specific"
          />
          <StatCard
            label="Periods today"
            value={todaySlots.filter((s) => s.kind === 'CLASS').length}
            icon={CalendarClock}
            tone="gold"
            hint={dayName}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-12">
          {/* Today's schedule */}
          <Panel className="xl:col-span-7" title="Today’s schedule">
            {!overview ? (
              <div className="h-56 animate-pulse rounded-2xl bg-ink-100" />
            ) : todaySlots.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="No periods today"
                hint="Enjoy the prep time — or catch up on marks entry."
              />
            ) : (
              <ol className="space-y-2">
                {todaySlots.map((slot) => (
                  <li
                    key={`${slot.dayOfWeek}-${slot.periodNo}`}
                    className={cn(
                      'flex items-center gap-4 rounded-2xl border p-3',
                      slot.kind === 'ASSEMBLY'
                        ? 'border-signal-200 bg-signal-50/60'
                        : slot.kind === 'BREAK'
                          ? 'border-ink-100 bg-ink-50/60'
                          : 'border-ink-100 bg-white',
                    )}
                  >
                    <span className="w-16 shrink-0 font-mono text-xs font-semibold text-ink-500">
                      {slot.startTime}
                    </span>
                    <div className="min-w-0">
                      {slot.kind === 'CLASS' ? (
                        <>
                          <p className="truncate text-sm font-semibold text-ink-800">
                            {slot.subject?.name ?? 'Class'}
                          </p>
                          <p className="text-[10px] uppercase tracking-wider text-ink-400">
                            {slot.section?.className} {slot.section?.name}
                            {slot.room ? ` · ${slot.room}` : ''}
                          </p>
                        </>
                      ) : (
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-500">
                          {slot.kind}
                        </p>
                      )}
                    </div>
                    <span className="ml-auto font-mono text-[10px] text-ink-400">
                      → {slot.endTime}
                    </span>
                  </li>
                ))}
              </ol>
            )}
            <div className="mt-4 border-t border-ink-100 pt-4">
              <Link
                href="/teacher/timetable"
                className="inline-flex items-center gap-2 text-xs font-semibold text-brand-700 hover:text-brand-600"
              >
                Full week
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          </Panel>

          {/* Notices */}
          <div className="xl:col-span-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-brand-950">
                <Megaphone className="h-5 w-5 text-brand-600" aria-hidden />
                Notices
              </h2>
              <Link
                href="/teacher/notices"
                className="text-xs font-semibold text-brand-700 hover:text-brand-600"
              >
                View all →
              </Link>
            </div>
            <div className="mt-3">
              <NoticeFeed />
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              href: '/teacher/attendance',
              icon: CalendarCheck2,
              title: 'Register',
              body: 'Mark today’s attendance for your sections.',
            },
            {
              href: '/teacher/marks',
              icon: ClipboardList,
              title: 'Marks entry',
              body: 'Enter or correct marks for your subjects.',
            },
            {
              href: '/teacher/timetable',
              icon: CalendarClock,
              title: 'My timetable',
              body: 'Sunday–Thursday grid across all assigned sections.',
            },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="group rounded-3xl border border-ink-100 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-brand-200"
              >
                <Icon className="h-6 w-6 text-brand-600" aria-hidden />
                <p className="mt-3 font-display text-base font-semibold text-brand-950">
                  {action.title}
                </p>
                <p className="mt-1 text-xs leading-5 text-ink-500">{action.body}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
