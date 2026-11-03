'use client';

import { PageTransition } from '@/components/motion/page-transition';

/**
 * `template.tsx` remounts on every route change, which gives each page
 * its own enter/exit animation cycle.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
