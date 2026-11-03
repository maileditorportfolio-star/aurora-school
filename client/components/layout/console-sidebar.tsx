'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { GraduationCap, Home, LogOut, Menu, X, type LucideIcon } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { cn, initials } from '@/lib/utils';

export interface ConsoleNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  permission?: string;
  superAdmin?: boolean;
}

interface ConsoleSidebarProps {
  brandLine: string;
  caption: string;
  items: ConsoleNavItem[];
  homeHref?: string;
  homeLabel?: string;
}

/**
 * Shared dark sidebar for the three consoles (admin, teacher, portal).
 * Items with `permission` are shown to super admins and to admins who hold
 * that permission; `superAdmin` items are exclusive to the super admin.
 */
export function ConsoleSidebar({
  brandLine,
  caption,
  items,
  homeHref = '/',
  homeLabel = 'View school site',
}: ConsoleSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isAdmin = user?.role === 'ADMIN';
  const permissions = user?.permissions ?? [];

  const visibleItems = items.filter((item) => {
    if (!user) return true;
    if (isSuperAdmin) return true;
    if (item.superAdmin) return false;
    if (!item.permission) return true;
    if (!isAdmin) return false; // teachers and portal users see curated consoles without permissions
    return permissions.includes(item.permission);
  });

  const isActive = (item: ConsoleNavItem) =>
    item.exact ? pathname === item.href : pathname?.startsWith(item.href);

  const content = (
    <div className="flex h-full flex-col bg-brand-950 text-white">
      <div className="flex items-center gap-2.5 px-6 py-6">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-800 text-signal-300">
          <GraduationCap className="h-5 w-5" aria-hidden />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="text-base font-bold tracking-tight">{brandLine}</span>
          <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-brand-300">
            {caption}
          </span>
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 pb-4" aria-label="Console">
        {visibleItems.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                'relative flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium transition-colors',
                active ? 'text-white' : 'text-brand-200/70 hover:bg-white/5 hover:text-white',
              )}
              aria-current={active ? 'page' : undefined}
            >
              {active && (
                <motion.span
                  layoutId={`console-active-${brandLine}`}
                  className="absolute inset-0 -z-10 rounded-2xl bg-brand-600/25 ring-1 ring-brand-500/40"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}

        <Link
          href={homeHref}
          className="mt-2 flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium text-brand-200/70 transition-colors hover:bg-white/5 hover:text-white"
        >
          <Home className="h-[18px] w-[18px]" aria-hidden />
          {homeLabel}
        </Link>
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3 rounded-2xl px-2 py-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-500/20 text-xs font-bold text-brand-100">
            {initials(user?.name ?? 'Guest')}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user?.name ?? 'Guest'}</p>
            <p className="truncate text-[10px] uppercase tracking-wider text-brand-300/80">
              {user?.role ?? ''}
            </p>
          </div>
          <Link
            href="/account"
            className="text-[11px] font-semibold text-brand-300 transition-colors hover:text-white"
            title="My account"
          >
            Account
          </Link>
          <button
            onClick={() => {
              logout();
              router.push('/');
            }}
            aria-label="Sign out"
            title="Sign out"
            className="text-brand-300/80 transition-colors hover:text-rose-300"
          >
            <LogOut className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden w-72 shrink-0 lg:block">
        <div className="fixed inset-y-0 left-0 w-72">{content}</div>
      </aside>

      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-ink-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <span className="flex items-center gap-2 text-sm font-bold text-ink-900">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-700 text-signal-300">
            <GraduationCap className="h-4 w-4" aria-hidden />
          </span>
          {brandLine}
        </span>
        <button
          onClick={() => setOpen((value) => !value)}
          aria-label="Toggle navigation"
          aria-expanded={open}
          className="grid h-10 w-10 place-items-center rounded-xl text-ink-700 transition-colors hover:bg-ink-100"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-ink-950/50 backdrop-blur-sm lg:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 32 }}
              className="fixed inset-y-0 left-0 z-50 w-72 lg:hidden"
            >
              {content}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default ConsoleSidebar;
