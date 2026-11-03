'use client';

import { useEffect, useState } from 'react';
import { Settings, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import type { SchoolSettings } from '@/types';
import { ConsoleHeader, Panel } from '@/components/ui/console';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { useSchoolSettings } from '@/components/providers/school-settings';

export default function AdminSettingsPage() {
  const { refresh } = useSchoolSettings();
  const [form, setForm] = useState<SchoolSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.admin.settings
      .get()
      .then(({ settings }) => setForm(settings))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load settings'));
  }, []);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const { settings } = await api.admin.settings.update({
        schoolName: form.schoolName,
        tagline: form.tagline,
        announcement: form.announcement,
        heroDescription: form.heroDescription,
        phone: form.phone,
        email: form.email,
        address: form.address,
        principal: form.principal,
        establishedYear: form.establishedYear,
      });
      setForm(settings);
      setMessage('Saved. The landing page now serves the updated copy.');
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save settings');
    } finally {
      setSaving(false);
    }
  };

  if (!form) {
    return (
      <>
        <ConsoleHeader title="School settings" />
        <div className="p-5 sm:p-8">
          <div className="h-72 animate-pulse rounded-3xl bg-ink-100" />
        </div>
      </>
    );
  }

  const field = (
    label: string,
    key: keyof SchoolSettings,
    props: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <Input
      label={label}
      value={String(form[key] ?? '')}
      onChange={(event) =>
        setForm({
          ...form,
          [key]: props.type === 'number' ? Number(event.target.value) : event.target.value,
        })
      }
      {...props}
    />
  );

  return (
    <>
      <ConsoleHeader
        title="School settings"
        description="The public shopfront: name, contact, announcement and hero copy shown on the landing page."
        actions={
          <Button size="sm" onClick={save} loading={saving}>
            <Save className="h-4 w-4" aria-hidden />
            Save changes
          </Button>
        }
      />

      <form onSubmit={save} className="grid gap-6 p-5 sm:p-8 xl:grid-cols-12">
        <Panel className="xl:col-span-7" title="Identity">
          <div className="grid gap-4 sm:grid-cols-2">
            {field('School name', 'schoolName')}
            {field('Tagline', 'tagline')}
            {field('Established year', 'establishedYear', { type: 'number', min: 1800, max: 2100 })}
            {field('Principal', 'principal')}
          </div>
          <div className="mt-4">
            <Textarea
              label="Hero description (landing page)"
              value={form.heroDescription}
              onChange={(event) => setForm({ ...form, heroDescription: event.target.value })}
            />
          </div>
          <div className="mt-4">
            <Input
              label="Announcement ticker"
              value={form.announcement}
              onChange={(event) => setForm({ ...form, announcement: event.target.value })}
              hint="Scrolls across the top of every public page."
            />
          </div>
        </Panel>

        <Panel className="xl:col-span-5 self-start" title="Contact">
          <div className="grid gap-4">
            {field('Phone', 'phone', { type: 'tel' })}
            {field('Email', 'email', { type: 'email' })}
            {field('Address', 'address')}
          </div>

          <div className="mt-5 rounded-2xl border border-brand-100 bg-brand-50/60 p-4 text-xs leading-6 text-brand-900">
            <p className="flex items-center gap-2 font-semibold">
              <Settings className="h-4 w-4" />
              Where this shows up
            </p>
            <p className="mt-1">
              Header ticker, footer contact block, the hero on the home page, and the admission
              call-to-action. Changes are live as soon as you save.
            </p>
          </div>

          {error && (
            <p
              role="alert"
              className="mt-4 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700"
            >
              <AlertCircle className="h-4 w-4" />
              {error}
            </p>
          )}
          {message && (
            <p
              role="status"
              className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800"
            >
              <CheckCircle2 className="h-4 w-4" />
              {message}
            </p>
          )}
        </Panel>
      </form>
    </>
  );
}
