'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  GraduationCap,
  ShieldCheck,
  Microscope,
  Bus,
  ClipboardCheck,
  Trophy,
  ArrowRight,
  CalendarDays,
  MapPin,
  Pin,
  Users,
  BookOpenCheck,
  Sparkles,
  PhoneCall,
} from 'lucide-react';
import { useSchoolSettings } from '@/components/providers/school-settings';
import { api } from '@/lib/api';
import type { Notice, SchoolEvent } from '@/types';
import { cn, formatDate } from '@/lib/utils';

const FEATURES = [
  {
    icon: GraduationCap,
    title: 'Qualified teachers',
    body: 'Eight full-time specialists across Bangla, English, Mathematics, Science, ICT and values education.',
  },
  {
    icon: Microscope,
    title: 'Modern labs',
    body: 'A computing room with 24 machines, a science lab and a library with 2,000+ titles.',
  },
  {
    icon: ClipboardCheck,
    title: 'Live attendance & results',
    body: 'Parents track attendance, grades and fee status from the family portal — every day.',
  },
  {
    icon: Bus,
    title: 'Safe transport',
    body: 'Two GPS-tracked routes covering Mirpur and Dhanmondi with named drivers and stops.',
  },
  {
    icon: ShieldCheck,
    title: 'A safe campus',
    body: 'CCTV coverage, verified gate passes and same-day absence calls to guardians.',
  },
  {
    icon: Trophy,
    title: 'Beyond the classroom',
    body: 'Sports day, science fair, book fair and morning assembly — every week has a rhythm.',
  },
];

const STATS = [
  { value: '1–10', label: 'Grades taught' },
  { value: '10', label: 'Sections' },
  { value: '40+', label: 'Students enrolled' },
  { value: '1998', label: 'Founded' },
];

export default function HomePage() {
  const { settings } = useSchoolSettings();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [events, setEvents] = useState<SchoolEvent[]>([]);

  useEffect(() => {
    api.public
      .notices()
      .then(({ notices }) => setNotices(notices.slice(0, 4)))
      .catch(() => {});
    api.public
      .events()
      .then(({ events }) => setEvents(events.slice(0, 3)))
      .catch(() => {});
  }, []);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-950 text-white">
        <div className="absolute inset-0 bg-aurora-deep" aria-hidden />
        <div className="absolute inset-0 bg-grid-fine bg-grid opacity-60" aria-hidden />

        <div className="container-page relative grid gap-12 py-20 lg:grid-cols-12 lg:py-28">
          <div className="lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-signal-300">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Admission open · 2026–2027
              </span>

              <h1 className="mt-6 font-display text-5xl leading-[1.02] text-white sm:text-6xl xl:text-7xl">
                {settings.schoolName}
                <span className="mt-3 block bg-gradient-to-r from-signal-300 via-brand-300 to-brand-100 bg-clip-text text-transparent">
                  where curiosity becomes craft.
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-7 text-brand-100/90 sm:text-lg">
                {settings.heroDescription}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/notices"
                  className="inline-flex items-center gap-2 rounded-full bg-signal-400 px-6 py-3 text-sm font-bold text-ink-950 shadow-glow transition hover:bg-signal-300"
                >
                  Admission notices
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Family portal
                </Link>
                <a
                  href={`tel:${settings.phone}`}
                  className="inline-flex items-center gap-2 px-2 py-3 text-sm font-medium text-brand-200 transition hover:text-white"
                >
                  <PhoneCall className="h-4 w-4" aria-hidden />
                  {settings.phone}
                </a>
              </div>

              {/* Stats strip */}
              <dl className="mt-12 grid max-w-xl grid-cols-2 gap-6 border-t border-white/10 pt-6 sm:grid-cols-4">
                {STATS.map((stat) => (
                  <div key={stat.label}>
                    <dt className="sr-only">{stat.label}</dt>
                    <dd className="font-display text-2xl font-semibold text-white sm:text-3xl">
                      {stat.value}
                    </dd>
                    <dd className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-300">
                      {stat.label}
                    </dd>
                  </div>
                ))}
              </dl>
            </motion.div>
          </div>

          {/* Hero card — report card style */}
          <div className="relative flex items-center lg:col-span-5">
            <motion.div
              initial={{ opacity: 0, y: 30, rotate: 1.5 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-signal-300">
                    Live preview
                  </p>
                  <p className="text-sm font-semibold text-white">Grade 6A — Half Yearly</p>
                </div>
                <BookOpenCheck className="h-5 w-5 text-brand-300" aria-hidden />
              </div>
              <div className="mt-4 space-y-2 font-mono text-[11px] text-brand-100">
                {[
                  ['Mathematics', '87', 'A+'],
                  ['Science', '74', 'A'],
                  ['Bangla', '91', 'A+'],
                  ['ICT', '83', 'A+'],
                ].map(([subject, mark, grade]) => (
                  <div
                    key={subject}
                    className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2"
                  >
                    <span className="text-brand-200">{subject}</span>
                    <span className="flex items-center gap-3">
                      <span>{mark}/100</span>
                      <span className="rounded-md bg-signal-400/90 px-1.5 py-0.5 text-[10px] font-bold text-ink-950">
                        {grade}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between rounded-2xl border border-signal-400/30 bg-signal-400/10 px-4 py-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-signal-300">GPA</p>
                  <p className="font-display text-2xl font-semibold text-white">4.75</p>
                </div>
                <div className="text-right text-[11px] text-brand-200">
                  <p>Attendance 95%</p>
                  <p className="mt-1 text-signal-300">Fees up to date</p>
                </div>
              </div>
              <p className="mt-3 text-center text-[10px] text-brand-300/70">
                Exactly what parents see — updated after every exam.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container-page py-16 lg:py-20">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-600">
              Why Aurora School
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-brand-950 sm:text-4xl">
              A school you can see through — in the best way.
            </h2>
          </div>
          <Link
            href="/notices"
            className="text-sm font-semibold text-brand-700 hover:text-brand-600"
          >
            Latest notices →
          </Link>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="group rounded-3xl border border-ink-100 bg-white p-6 shadow-soft transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card"
              >
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-100">
                  <Icon className="h-6 w-6" aria-hidden />
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold text-brand-950">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-ink-500">{feature.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Notices & events */}
      <section className="border-t border-ink-100 bg-white">
        <div className="container-page grid gap-10 py-14 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-display text-2xl font-semibold text-brand-950">Notice board</h2>
              <Link
                href="/notices"
                className="text-xs font-semibold uppercase tracking-wider text-brand-700 hover:text-brand-600"
              >
                View all
              </Link>
            </div>
            <ul className="mt-6 divide-y divide-ink-100">
              {notices.length === 0 && (
                <li className="py-6 text-sm text-ink-400">
                  Notices will appear here once published.
                </li>
              )}
              {notices.map((notice) => (
                <li key={notice.id} className="py-4">
                  <div className="flex items-start gap-3">
                    {notice.isPinned && (
                      <Pin
                        className="mt-1 h-4 w-4 shrink-0 rotate-45 text-signal-600"
                        aria-label="Pinned"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-ink-900">{notice.title}</p>
                        {notice.priority === 'URGENT' && (
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700">
                            Urgent
                          </span>
                        )}
                        {notice.priority === 'IMPORTANT' && (
                          <span className="rounded-full bg-signal-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-signal-800">
                            Important
                          </span>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-ink-500">
                        {notice.body}
                      </p>
                      <p className="mt-1.5 text-[10px] uppercase tracking-wider text-ink-400">
                        {formatDate(notice.publishedAt)} · {notice.audience}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-5">
            <h2 className="font-display text-2xl font-semibold text-brand-950">Upcoming events</h2>
            <div className="mt-6 space-y-4">
              {events.length === 0 && (
                <p className="text-sm text-ink-400">No events scheduled yet.</p>
              )}
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex gap-4 rounded-3xl border border-ink-100 bg-frost p-4"
                >
                  <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-brand-800 text-center text-white">
                    <div>
                      <CalendarDays className="mx-auto h-4 w-4 text-signal-300" aria-hidden />
                      <p className="mt-0.5 font-display text-lg leading-none">
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
                    {event.location && (
                      <p className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-brand-700">
                        <MapPin className="h-3 w-3" aria-hidden />
                        {event.location}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              <div className="rounded-3xl bg-brand-950 p-5 text-white">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-signal-300" aria-hidden />
                  <p className="font-display text-lg font-semibold">Visit us</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-brand-100/90">
                  {settings.address}. Office hours Sunday–Thursday, 8:00 AM – 4:00 PM. Bring your
                  guardian and previous results copy for admission counselling.
                </p>
                <Link
                  href="/login"
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/15"
                >
                  I already have an account
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
