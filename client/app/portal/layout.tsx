'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarCheck2,
  ClipboardList,
  Wallet,
  CalendarClock,
  Megaphone,
  Library,
  Bus,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { ConsoleSidebar, type ConsoleNavItem } from '@/components/layout/console-sidebar';
import { PortalChildProvider } from '@/components/portal-child';

const ITEMS: ConsoleNavItem[] = [
  { href: '/portal', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/portal/attendance', label: 'Attendance', icon: CalendarCheck2 },
  { href: '/portal/results', label: 'Results & Grades', icon: ClipboardList },
  { href: '/portal/fees', label: 'Fees & Receipts', icon: Wallet },
  { href: '/portal/timetable', label: 'Timetable', icon: CalendarClock },
  { href: '/portal/notices', label: 'Notices', icon: Megaphone },
  { href: '/portal/library', label: 'Library', icon: Library },
  { href: '/portal/transport', label: 'Transport', icon: Bus },
];

/** Student & parent portal. */
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role === 'STUDENT' || user.role === 'PARENT') return;
    if (user.role === 'TEACHER') router.replace('/teacher');
    else router.replace('/admin');
  }, [user, isLoading, router]);

  if (!user || (user.role !== 'STUDENT' && user.role !== 'PARENT')) {
    return (
      <div className="grid min-h-screen place-items-center bg-frost">
        <p className="text-sm text-ink-400">Checking your access…</p>
      </div>
    );
  }

  return (
    <PortalChildProvider>
      <div className="flex min-h-screen bg-frost">
        <ConsoleSidebar brandLine="Aurora School" caption="Family Portal" items={ITEMS} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </PortalChildProvider>
  );
}
