'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { SchoolSettings } from '@/types';

const FALLBACK: SchoolSettings = {
  id: 'default',
  schoolName: 'Aurora School',
  tagline: 'Learn. Lead. Shine.',
  announcement: 'Admission open for 2026–2027',
  heroDescription:
    "A nurturing school for grades 1 to 10 — qualified teachers, modern labs, live progress tracking and safe transport, all the way to your child's report card.",
  phone: '+880 1700-000000',
  email: 'info@aurora.school',
  address: '12 School Road, Dhaka 1205',
  principal: 'Ayesha Rahman',
  establishedYear: 1998,
};

interface SchoolSettingsContextValue {
  settings: SchoolSettings;
  loading: boolean;
  refresh: () => Promise<void>;
}

const SchoolSettingsContext = createContext<SchoolSettingsContextValue>({
  settings: FALLBACK,
  loading: true,
  refresh: async () => {},
});

export const useSchoolSettings = () => useContext(SchoolSettingsContext);

/**
 * Loads the public school copy once on mount (announcement, name, contact)
 * so the chrome and landing page can render instantly from local fallbacks.
 */
export function SchoolSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SchoolSettings>(FALLBACK);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const { settings: remote } = await api.public.settings();
      setSettings(remote);
    } catch {
      // Offline or API down — keep the fallback copy.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { settings: remote } = await api.public.settings();
        if (!cancelled) setSettings(remote);
      } catch {
        // Offline or API down — keep the fallback copy.
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SchoolSettingsContext.Provider value={{ settings, loading, refresh }}>
      {children}
    </SchoolSettingsContext.Provider>
  );
}
