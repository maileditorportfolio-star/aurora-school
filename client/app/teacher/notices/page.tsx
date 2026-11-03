'use client';

import { ConsoleHeader } from '@/components/ui/console';
import { NoticeFeed } from '@/components/notice-feed';

export default function TeacherNoticesPage() {
  return (
    <>
      <ConsoleHeader
        title="Notices"
        description="School announcements addressed to faculty and staff."
      />
      <div className="max-w-3xl p-5 sm:p-8">
        <NoticeFeed />
      </div>
    </>
  );
}
