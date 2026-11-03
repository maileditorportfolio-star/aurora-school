'use client';

import { usePathname } from 'next/navigation';
import { PublicFooter } from './public-footer';
import { PublicHeader } from './public-header';
import { ChatWidget } from '@/components/chat/chat-widget';

const PORTAL_PREFIXES = ['/admin', '/teacher', '/portal'];

/**
 * Wraps public pages in the marketing chrome (header + footer + support
 * chat). Signed-in consoles (/admin, /teacher, /portal) render chrome-free.
 */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';
  const isPortal = PORTAL_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isPortal) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
      <ChatWidget />
    </div>
  );
}

export default SiteChrome;
