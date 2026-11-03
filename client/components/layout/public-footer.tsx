'use client';

import Link from 'next/link';
import { GraduationCap, Mail, MapPin, Phone } from 'lucide-react';
import { useSchoolSettings } from '@/components/providers/school-settings';

export function PublicFooter() {
  const { settings } = useSchoolSettings();

  return (
    <footer className="border-t border-brand-900/10 bg-brand-950 text-brand-100">
      <div className="container-page grid gap-10 py-12 md:grid-cols-12">
        <div className="md:col-span-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-800 text-signal-300">
              <GraduationCap className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="font-display text-lg font-semibold text-white">{settings.schoolName}</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-brand-300">
                Est. {settings.establishedYear} · Dhaka
              </p>
            </div>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-6 text-brand-200/90">
            {settings.tagline} — a full-school system: attendance, exams, fees, library and
            transport, all in one place for parents and staff.
          </p>
        </div>

        <div className="md:col-span-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-signal-300">
            Contact
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" aria-hidden />
              <span>{settings.address}</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0 text-brand-400" aria-hidden />
              <a href={`tel:${settings.phone}`} className="hover:text-white">
                {settings.phone}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0 text-brand-400" aria-hidden />
              <a href={`mailto:${settings.email}`} className="hover:text-white">
                {settings.email}
              </a>
            </li>
          </ul>
        </div>

        <div className="md:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-signal-300">
            School
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/notices" className="hover:text-white">
                Notices
              </Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-white">
                Portal login
              </Link>
            </li>
            <li>
              <a href={`mailto:${settings.email}`} className="hover:text-white">
                Admissions
              </a>
            </li>
          </ul>
        </div>

        <div className="md:col-span-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-signal-300">
            Office hours
          </p>
          <ul className="mt-3 space-y-1.5 text-sm text-brand-200/90">
            <li>Sunday – Thursday</li>
            <li>8:00 AM – 4:00 PM</li>
            <li className="text-brand-400">Principal: {settings.principal}</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex h-12 items-center justify-between text-[11px] text-brand-300">
          <p>
            © {new Date().getFullYear()} {settings.schoolName}. All rights reserved.
          </p>
          <p className="hidden sm:block">Managed with Aurora School ERP</p>
        </div>
      </div>
    </footer>
  );
}
