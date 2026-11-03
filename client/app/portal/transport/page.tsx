'use client';

import { useEffect, useState } from 'react';
import { Bus, MapPin, PhoneCall, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import type { StudentTransport } from '@/types';
import { ConsoleHeader, Panel, EmptyState } from '@/components/ui/console';
import { PortalChildSelect, usePortalChild } from '@/components/portal-child';
import { formatCurrency } from '@/lib/utils';

export default function PortalTransportPage() {
  const { selected, loading: childLoading } = usePortalChild();
  const [transport, setTransport] = useState<StudentTransport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selected) return;
    Promise.resolve().then(() => {
      setLoading(true);
      api.portal
        .transport({ studentId: selected.id })
        .then(({ transport }) => setTransport(transport))
        .finally(() => setLoading(false));
    });
  }, [selected]);

  const driver = transport?.route?.vehicles?.[0];

  return (
    <>
      <ConsoleHeader
        title="Transport"
        description="Route, stops, pickup time and the driver’s direct line."
        actions={<PortalChildSelect />}
      />

      <div className="space-y-5 p-5 sm:p-8">
        {childLoading || loading ? (
          <div className="h-48 animate-pulse rounded-3xl bg-ink-100" />
        ) : !transport ? (
          <EmptyState
            icon={Bus}
            title="Not assigned to transport"
            hint="If your child uses school transport, ask the office to assign the route and stop."
          />
        ) : (
          <div className="grid gap-6 xl:grid-cols-12">
            {/* Route summary */}
            <Panel className="xl:col-span-4 self-start" title={transport.route?.name ?? 'Route'}>
              <dl className="grid gap-3 text-sm">
                <div className="rounded-2xl bg-frost p-3">
                  <dt className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-400">
                    Your stop
                  </dt>
                  <dd className="mt-1 font-semibold text-ink-800">
                    {transport.stop?.name ?? 'Any stop on the route'}
                  </dd>
                  {transport.stop?.pickupTime && (
                    <dd className="text-xs text-ink-500">Pickup {transport.stop.pickupTime}</dd>
                  )}
                </div>
                <div className="rounded-2xl bg-frost p-3">
                  <dt className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-400">
                    Monthly fee
                  </dt>
                  <dd className="mt-1 font-display text-2xl font-semibold text-brand-900">
                    {formatCurrency(transport.monthlyFee)}
                  </dd>
                </div>
                <div className="rounded-2xl bg-frost p-3">
                  <dt className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-400">
                    Vehicle
                  </dt>
                  <dd className="mt-1 font-mono text-sm font-semibold text-ink-800">
                    {driver?.regNo ?? 'To be announced'}
                  </dd>
                  {driver?.model && (
                    <dd className="text-xs text-ink-500">
                      {driver.model} · {driver.capacity} seats
                    </dd>
                  )}
                  {driver?.driverName && (
                    <dd className="mt-2 flex items-center gap-2 text-xs text-ink-700">
                      <PhoneCall className="h-3.5 w-3.5 text-brand-600" aria-hidden />
                      {driver.driverName}
                      {driver.driverPhone ? ` · ${driver.driverPhone}` : ''}
                    </dd>
                  )}
                </div>
              </dl>
            </Panel>

            {/* Stop list */}
            <Panel className="xl:col-span-8" title="All stops on this route">
              <ol className="space-y-2">
                {transport.route?.stops.map((stop) => {
                  const isMine = stop.id === transport.stopId;
                  return (
                    <li
                      key={stop.id}
                      className={
                        isMine
                          ? 'flex items-center gap-3 rounded-2xl border-2 border-brand-500 bg-brand-50/60 px-4 py-3'
                          : 'flex items-center gap-3 rounded-2xl border border-ink-100 bg-white px-4 py-3'
                      }
                    >
                      <span
                        className={
                          isMine
                            ? 'grid h-7 w-7 place-items-center rounded-full bg-brand-700 font-display text-xs font-bold text-white'
                            : 'grid h-7 w-7 place-items-center rounded-full bg-ink-100 font-display text-xs font-bold text-ink-500'
                        }
                      >
                        {stop.sequence}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink-800">
                          {stop.name}
                        </span>
                        {isMine && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-700">
                            Your stop
                          </span>
                        )}
                      </span>
                      {stop.pickupTime && (
                        <span className="flex items-center gap-1 font-mono text-xs text-ink-500">
                          <MapPin className="h-3.5 w-3.5" aria-hidden />
                          {stop.pickupTime}
                        </span>
                      )}
                      <span className="tabular-nums text-xs font-semibold text-ink-600">
                        {formatCurrency(stop.monthlyFee)}
                      </span>
                    </li>
                  );
                })}
              </ol>
              <p className="mt-4 flex items-center gap-2 text-[10px] text-ink-400">
                <AlertCircle className="h-3.5 w-3.5" aria-hidden />
                Buses run Sun–Thu. If your child misses the bus, call the driver or the office
                before 7:30 AM.
              </p>
            </Panel>
          </div>
        )}
      </div>
    </>
  );
}
