'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  GraduationCap,
  Users,
  CalendarCheck2,
  Wallet,
  Building2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { api, type AdminStats } from '@/lib/api';
import { ConsoleHeader, StatCard, Panel, EmptyState } from '@/components/ui/console';
import { formatCurrency, formatDate } from '@/lib/utils';

const TOOLTIP_STYLE = {
  borderRadius: 16,
  border: '1px solid #e2e8f0',
  boxShadow: '0 12px 32px -12px rgb(15 23 42 / 0.25)',
  fontSize: 12,
} as const;

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.admin
      .stats()
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load dashboard'));
  }, []);

  const totals = stats?.totals;

  return (
    <>
      <ConsoleHeader
        title="School dashboard"
        description="Live snapshot: enrolment, today’s attendance, fee collection and the classrooms that need attention."
        actions={
          <Link
            href="/admin/attendance"
            className="inline-flex items-center gap-2 rounded-full bg-brand-700 px-5 py-2 text-xs font-semibold text-white transition hover:bg-brand-600"
          >
            Mark attendance
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        }
      />

      <div className="space-y-6 p-5 sm:p-8">
        {error && (
          <p
            className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
            role="alert"
          >
            <AlertCircle className="h-4 w-4" aria-hidden />
            {error} — check that you hold the analytics.read permission.
          </p>
        )}

        {/* KPI row */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Active students"
            value={totals ? totals.students : '—'}
            hint={`${totals?.classes ?? '—'} classes · ${totals?.sections ?? '—'} sections`}
            icon={GraduationCap}
            tone="brand"
          />
          <StatCard
            label="Teachers & staff"
            value={totals ? totals.staff : '—'}
            hint="Full-time faculty"
            icon={Users}
            tone="ink"
          />
          <StatCard
            label="Present today"
            value={totals ? `${totals.attendanceRate}%` : '—'}
            hint={totals ? `${totals.presentToday} present right now` : undefined}
            icon={CalendarCheck2}
            tone="gold"
          />
          <StatCard
            label="Fees outstanding"
            value={totals ? formatCurrency(totals.outstanding) : '—'}
            hint={totals ? `${formatCurrency(totals.collected)} collected all-time` : undefined}
            icon={Wallet}
            tone="danger"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-12">
          {/* Attendance trend */}
          <Panel
            className="xl:col-span-7"
            title="Attendance — last 14 days"
            actions={<CalendarCheck2 className="h-4 w-4 text-brand-600" aria-hidden />}
          >
            {!stats ? (
              <div className="h-64 animate-pulse rounded-2xl bg-ink-100" />
            ) : stats.attendanceTrend.length === 0 ? (
              <EmptyState
                title="No attendance recorded yet"
                hint="Use Mark attendance to start today’s register."
              />
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={stats.attendanceTrend.map((row) => ({ ...row, day: row.date.slice(5) }))}
                    margin={{ top: 8, right: 8, left: -14, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="presentFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0d9488" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="#0d9488" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="day"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Area
                      type="monotone"
                      dataKey="present"
                      name="Present"
                      stroke="#0f766e"
                      strokeWidth={2.5}
                      fill="url(#presentFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </Panel>

          {/* Class strength */}
          <Panel className="xl:col-span-5" title="Class strength">
            {!stats ? (
              <div className="h-64 animate-pulse rounded-2xl bg-ink-100" />
            ) : (
              <ol className="space-y-2">
                {stats.classStrength
                  .filter((row) => row.students > 0)
                  .map((row) => {
                    const max = Math.max(...stats.classStrength.map((r) => r.students), 1);
                    return (
                      <li key={row.name} className="flex items-center gap-3">
                        <span className="w-20 shrink-0 text-xs font-semibold text-ink-600">
                          {row.name}
                        </span>
                        <div className="h-3 flex-1 overflow-hidden rounded-full bg-ink-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-700"
                            style={{ width: `${(row.students / max) * 100}%` }}
                          />
                        </div>
                        <span className="w-8 text-right font-display text-sm font-semibold text-brand-950">
                          {row.students}
                        </span>
                      </li>
                    );
                  })}
              </ol>
            )}
          </Panel>
        </div>

        <div className="grid gap-6 xl:grid-cols-12">
          {/* Collections by month */}
          <Panel className="xl:col-span-7" title="Fee collection — last 6 months">
            {!stats ? (
              <div className="h-56 animate-pulse rounded-2xl bg-ink-100" />
            ) : stats.collectionsByMonth.length === 0 ? (
              <EmptyState title="No payments yet" hint="Recorded payments will chart here." />
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.collectionsByMonth}
                    margin={{ top: 8, right: 8, left: 4, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="month"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(value) => [formatCurrency(Number(value)), 'Collected']}
                    />
                    <Bar
                      dataKey="collected"
                      name="Collected"
                      fill="#f59e0b"
                      radius={[8, 8, 0, 0]}
                      maxBarSize={48}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Panel>

          {/* Defaulters */}
          <Panel
            className="xl:col-span-5"
            title="Fee defaulters"
            actions={<Building2 className="h-4 w-4 text-ink-400" aria-hidden />}
          >
            {!stats ? (
              <div className="h-56 animate-pulse rounded-2xl bg-ink-100" />
            ) : stats.topDefaulters.length === 0 ? (
              <EmptyState title="All clear" hint="No outstanding dues across active students." />
            ) : (
              <ol className="divide-y divide-ink-100">
                {stats.topDefaulters.map((row, index) => (
                  <li key={row.studentId} className="flex items-center gap-3 py-2.5">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-rose-50 font-display text-xs font-bold text-rose-600">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink-800">{row.name}</p>
                      <p className="text-[10px] uppercase tracking-wider text-ink-400">
                        {row.admissionNo}
                      </p>
                    </div>
                    <span className="font-display text-sm font-semibold text-rose-600">
                      {formatCurrency(row.due)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
