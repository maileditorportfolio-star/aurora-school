'use client';

import { ConsoleHeader } from '@/components/ui/console';
import { NoticeFeed } from '@/components/notice-feed';

export default function PortalNoticesPage() {
  return (
    <>
      <ConsoleHeader
        title="Notices for families"
        description="Official announcements addressed to students and parents."
      />
      <div className="max-w-3xl p-5 sm:p-8">
        <NoticeFeed />
      </div>
    </>
  );
}
