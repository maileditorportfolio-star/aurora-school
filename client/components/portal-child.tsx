'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { PortalOverview } from '@/types';

interface PortalChild {
  id: string;
  admissionNo: string;
  firstName: string;
  lastName: string;
  className: string | null;
  sectionName: string | null;
  label: string;
}

interface PortalChildContextValue {
  children: PortalChild[];
  selected: PortalChild | null;
  select: (id: string) => void;
  loading: boolean;
  error: string | null;
}

const PortalChildContext = createContext<PortalChildContextValue>({
  children: [],
  selected: null,
  select: () => {},
  loading: true,
  error: null,
});

export const usePortalChild = () => useContext(PortalChildContext);

/**
 * Loads the children linked to the signed-in account (one for students,
 * many for parents) and exposes the active selection to every portal page.
 */
export function PortalChildProvider({ children }: { children: React.ReactNode }) {
  const [overview, setOverview] = useState<PortalOverview | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.portal
      .overview()
      .then((data) => {
        setOverview(data);
        setSelectedId((prev) => prev ?? data.students[0]?.id ?? null);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Could not load your children'),
      );
  }, []);

  const list: PortalChild[] =
    overview?.students.map((child) => ({
      id: child.id,
      admissionNo: child.admissionNo,
      firstName: child.firstName,
      lastName: child.lastName,
      className: child.className,
      sectionName: child.sectionName,
      label:
        `${child.firstName} ${child.lastName} · ${child.className ?? 'Unassigned'} ${child.sectionName ?? ''}`.trim(),
    })) ?? [];

  const selected = list.find((child) => child.id === selectedId) ?? null;

  return (
    <PortalChildContext.Provider
      value={{
        children: list,
        selected,
        select: setSelectedId,
        loading: !overview && !error,
        error,
      }}
    >
      {children}
    </PortalChildContext.Provider>
  );
}

/** Dropdown rendered when a parent has more than one child. */
export function PortalChildSelect() {
  const { children, selected, select } = usePortalChild();
  if (children.length <= 1) return null;

  return (
    <label className="flex items-center gap-2 text-xs font-semibold text-ink-500">
      Viewing
      <select
        value={selected?.id ?? ''}
        onChange={(event) => select(event.target.value)}
        aria-label="Choose child"
        className="h-10 rounded-xl border border-ink-200 bg-white px-3 text-xs font-semibold text-ink-800 outline-none focus:border-brand-500"
      >
        {children.map((child) => (
          <option key={child.id} value={child.id}>
            {child.label}
          </option>
        ))}
      </select>
    </label>
  );
}
