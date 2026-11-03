// @ts-nocheck
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils';
import type { Notice, NoticeAudience, SchoolEvent } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Megaphone, CalendarDays, Plus, Pin, Trash2, Pencil, AlertCircle } from 'lucide-react';

export interface NoticeModalsProps {
  ctx: any;
}

export function NoticeModals({ ctx }: NoticeModalsProps) {
  const {
    noticeFormOpen,
    setNoticeFormOpen,
    editingNotice,
    noticeForm,
    setNoticeForm,
    saveNotice,
    saving,
    eventFormOpen,
    setEventFormOpen,
    editingEvent,
    eventForm,
    setEventForm,
    saveEvent,
  } = ctx;

  const AUDIENCES: NoticeAudience[] = ['ALL', 'STUDENTS', 'PARENTS', 'TEACHERS', 'STAFF'];

  return (
    <>
      {/* Notice modal */}
      <Modal
        open={noticeFormOpen}
        onClose={() => setNoticeFormOpen(false)}
        title={editingNotice ? 'Edit notice' : 'New notice'}
      >
        <form onSubmit={saveNotice} className="grid gap-4">
          <Input
            label="Title"
            value={noticeForm.title}
            onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })}
            required
          />
          <Textarea
            label="Body"
            value={noticeForm.body}
            onChange={(e) => setNoticeForm({ ...noticeForm, body: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="audience"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-500"
              >
                Audience
              </label>
              <select
                id="audience"
                value={noticeForm.audience}
                onChange={(e) =>
                  setNoticeForm({ ...noticeForm, audience: e.target.value as NoticeAudience })
                }
                className="h-12 w-full rounded-2xl border border-ink-200 bg-white px-4 text-sm outline-none focus:border-brand-500"
              >
                {AUDIENCES.map((audience) => (
                  <option key={audience} value={audience}>
                    {audience}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="priority"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-500"
              >
                Priority
              </label>
              <select
                id="priority"
                value={noticeForm.priority}
                onChange={(e) =>
                  setNoticeForm({ ...noticeForm, priority: e.target.value as Notice['priority'] })
                }
                className="h-12 w-full rounded-2xl border border-ink-200 bg-white px-4 text-sm outline-none focus:border-brand-500"
              >
                <option value="NORMAL">Normal</option>
                <option value="IMPORTANT">Important</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Expires (optional)"
              type="date"
              value={noticeForm.expiresAt}
              onChange={(e) => setNoticeForm({ ...noticeForm, expiresAt: e.target.value })}
            />
            <label className="flex cursor-pointer items-center gap-3 self-end rounded-2xl border border-ink-100 px-4 py-3">
              <input
                type="checkbox"
                className="accent-brand-700"
                checked={noticeForm.isPinned}
                onChange={(e) => setNoticeForm({ ...noticeForm, isPinned: e.target.checked })}
              />
              <span className="text-xs font-semibold text-ink-700">Pin to top of the board</span>
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setNoticeFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editingNotice ? 'Save changes' : 'Publish notice'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Event modal */}
      <Modal
        open={eventFormOpen}
        onClose={() => setEventFormOpen(false)}
        title={editingEvent ? 'Edit event' : 'New event'}
      >
        <form onSubmit={saveEvent} className="grid gap-4">
          <Input
            label="Title"
            value={eventForm.title}
            onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
            required
          />
          <Textarea
            label="Description"
            value={eventForm.description}
            onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Starts"
              type="datetime-local"
              value={eventForm.startAt}
              onChange={(e) => setEventForm({ ...eventForm, startAt: e.target.value })}
              required
            />
            <Input
              label="Ends (optional)"
              type="datetime-local"
              value={eventForm.endAt}
              onChange={(e) => setEventForm({ ...eventForm, endAt: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Location"
              placeholder="School field"
              value={eventForm.location}
              onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
            />
            <div>
              <label
                htmlFor="event-audience"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-500"
              >
                Audience
              </label>
              <select
                id="event-audience"
                value={eventForm.audience}
                onChange={(e) =>
                  setEventForm({ ...eventForm, audience: e.target.value as NoticeAudience })
                }
                className="h-12 w-full rounded-2xl border border-ink-200 bg-white px-4 text-sm outline-none focus:border-brand-500"
              >
                {AUDIENCES.map((audience) => (
                  <option key={audience} value={audience}>
                    {audience}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setEventFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editingEvent ? 'Save changes' : 'Publish event'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
