'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  School,
  CalendarClock,
  CalendarCheck2,
  ClipboardList,
  Wallet,
  Megaphone,
  Library,
  Bus,
  ShieldCheck,
  Settings,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { ConsoleSidebar, type ConsoleNavItem } from '@/components/layout/console-sidebar';

const ITEMS: ConsoleNavItem[] = [
  {
    href: '/admin',
    label: 'Dashboard',
    icon: LayoutDashboard,
    exact: true,
    permission: 'analytics.read',
  },
  { href: '/admin/students', label: 'Students', icon: GraduationCap, permission: 'students.write' },
  { href: '/admin/staff', label: 'Teachers & Staff', icon: Users, permission: 'staff.write' },
  {
    href: '/admin/classes',
    label: 'Classes & Subjects',
    icon: School,
    permission: 'classes.write',
  },
  {
    href: '/admin/timetable',
    label: 'Timetable',
    icon: CalendarClock,
    permission: 'timetable.write',
  },
  {
    href: '/admin/attendance',
    label: 'Attendance',
    icon: CalendarCheck2,
    permission: 'attendance.write',
  },
  { href: '/admin/exams', label: 'Exams & Marks', icon: ClipboardList, permission: 'marks.write' },
  { href: '/admin/fees', label: 'Fees & Payments', icon: Wallet, permission: 'fees.write' },
  {
    href: '/admin/notices',
    label: 'Notices & Events',
    icon: Megaphone,
    permission: 'notices.write',
  },
  { href: '/admin/library', label: 'Library', icon: Library, permission: 'library.write' },
  { href: '/admin/transport', label: 'Transport', icon: Bus, permission: 'transport.write' },
  { href: '/admin/team', label: 'Team', icon: ShieldCheck, superAdmin: true },
  { href: '/admin/settings', label: 'School Settings', icon: Settings, superAdmin: true },
];

/** Admin console — staff only. Others are redirected to their own home. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role === 'TEACHER') router.replace('/teacher');
    else if (user.role === 'STUDENT' || user.role === 'PARENT') router.replace('/portal');
  }, [user, isLoading, router]);

  const allowed = user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN');
  if (!allowed) {
    return (
      <div className="grid min-h-screen place-items-center bg-frost">
        <p className="text-sm text-ink-400">Checking your access…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-frost">
      <ConsoleSidebar brandLine="Aurora School" caption="Admin Console" items={ITEMS} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
