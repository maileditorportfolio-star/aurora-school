'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { GraduationCap, Megaphone, Menu, X, LogOut, LayoutDashboard } from 'lucide-react';
import { useSchoolSettings } from '@/components/providers/school-settings';
import { useAuthStore, roleHome } from '@/store/auth';
import { cn, initials } from '@/lib/utils';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/notices', label: 'Notices' },
  { href: '/login', label: 'Sign in' },
];

/** Top bar for public pages: announcement ticker, brand, nav, session entry. */
export function PublicHeader() {
  const { settings } = useSchoolSettings();
  const { user, logout } = useAuthStore();
  const pathname = usePathname() || '/';
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const consoleHref = user ? roleHome(user.role) : null;

  return (
    <header className="sticky top-0 z-50">
      {/* Announcement ticker */}
      <div className="bg-brand-950 text-brand-100">
        <div className="container-page flex h-9 items-center gap-3 text-[11px] font-medium tracking-wide">
          <Megaphone className="h-3.5 w-3.5 shrink-0 text-signal-300" aria-hidden />
          <div className="relative flex-1 overflow-hidden">
            <p className="whitespace-nowrap motion-safe:animate-marquee inline-block pe-16">
              {settings.announcement}
              <span className="px-8 text-brand-400">•</span>
              {settings.tagline}
              <span className="px-8 text-brand-400">•</span>
              Admission 2026–2027 open — call {settings.phone}
              <span className="px-8 text-brand-400">•</span>
            </p>
          </div>
        </div>
      </div>

      {/* Main bar */}
      <div className="border-b border-ink-100 bg-white/85 backdrop-blur-xl">
        <div className="container-page flex h-16 items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-700 text-white shadow-glow">
              <GraduationCap className="h-5 w-5" aria-hidden />
            </span>
            <span className="leading-tight">
              <span className="block font-display text-lg font-semibold text-brand-950">
                {settings.schoolName}
              </span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-400">
                Est. {settings.establishedYear} · Dhaka
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-medium text-ink-600 transition-colors hover:bg-brand-50 hover:text-brand-800',
                  pathname === item.href && 'bg-brand-50 text-brand-800',
                )}
              >
                {item.label}
              </Link>
            ))}
            {consoleHref ? (
              <>
                <Link
                  href={consoleHref}
                  className="ms-2 inline-flex items-center gap-2 rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-600"
                >
                  <LayoutDashboard className="h-4 w-4" aria-hidden />
                  Console
                </Link>
                <button
                  onClick={() => {
                    logout();
                    router.push('/');
                  }}
                  className="grid h-9 w-9 place-items-center rounded-full text-ink-500 transition hover:bg-ink-100 hover:text-ink-800"
                  aria-label="Sign out"
                  title={`Sign out (${user?.name ?? ''})`}
                >
                  <LogOut className="h-4 w-4" aria-hidden />
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="ms-2 hidden rounded-full bg-brand-700 px-5 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-600 sm:inline-flex"
              >
                Portal login
              </Link>
            )}
          </nav>

          <button
            className="grid h-10 w-10 place-items-center rounded-xl text-ink-600 hover:bg-ink-100 md:hidden"
            onClick={() => setOpen((value) => !value)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile nav */}
        {open && (
          <div className="border-t border-ink-100 bg-white px-4 pb-4 md:hidden">
            <div className="flex flex-col gap-1 pt-2">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-medium text-ink-700 hover:bg-brand-50 hover:text-brand-800"
                >
                  {item.label}
                </Link>
              ))}
              {consoleHref && (
                <Link
                  href={consoleHref}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-semibold text-brand-800 hover:bg-brand-50"
                >
                  Open console →
                </Link>
              )}
            </div>
            {user && (
              <div className="mt-3 flex items-center gap-3 rounded-2xl bg-frost p-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-700 text-xs font-bold text-white">
                  {initials(user.name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink-900">{user.name}</p>
                  <p className="text-[11px] uppercase tracking-wider text-ink-400">{user.role}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
