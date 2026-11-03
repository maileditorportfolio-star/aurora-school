'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarCheck2,
  ClipboardList,
  CalendarClock,
  Megaphone,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { ConsoleSidebar, type ConsoleNavItem } from '@/components/layout/console-sidebar';

const ITEMS: ConsoleNavItem[] = [
  { href: '/teacher', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/teacher/attendance', label: 'Mark Attendance', icon: CalendarCheck2 },
  { href: '/teacher/marks', label: 'Enter Marks', icon: ClipboardList },
  { href: '/teacher/timetable', label: 'My Timetable', icon: CalendarClock },
  { href: '/teacher/notices', label: 'Notices', icon: Megaphone },
];

/** Teacher console — TEACHER accounts only. */
export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role === 'TEACHER') return;
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') router.replace('/admin');
    else router.replace('/portal');
  }, [user, isLoading, router]);

  if (!user || user.role !== 'TEACHER') {
    return (
      <div className="grid min-h-screen place-items-center bg-frost">
        <p className="text-sm text-ink-400">Checking your access…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-frost">
      <ConsoleSidebar brandLine="Aurora School" caption="Teacher Console" items={ITEMS} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
