'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bus,
  Plus,
  Trash2,
  MapPin,
  Truck,
  UserRoundX,
  AlertCircle,
  Route as RouteIcon,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { Route, Student, TransportAssignment, Vehicle } from '@/types';
import { ConsoleHeader, Panel, EmptyState } from '@/components/ui/console';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { cn, formatCurrency, initials } from '@/lib/utils';
import { TransportModals } from '@/components/transport/transport-modals';

type Tab = 'routes' | 'vehicles' | 'assignments';

export default function TransportPage() {
  const [tab, setTab] = useState<Tab>('routes');
  const [routes, setRoutes] = useState<Route[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [assignments, setAssignments] = useState<TransportAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [routeFormOpen, setRouteFormOpen] = useState(false);
  const [routeForm, setRouteForm] = useState({ name: '', description: '' });
  const [stopFormOpen, setStopFormOpen] = useState(false);
  const [stopRouteId, setStopRouteId] = useState('');
  const [stopForm, setStopForm] = useState({
    name: '',
    sequence: '1',
    pickupTime: '',
    monthlyFee: '600',
  });

  const [vehicleFormOpen, setVehicleFormOpen] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({
    regNo: '',
    model: '',
    capacity: '36',
    driverName: '',
    driverPhone: '',
    routeId: '',
  });

  const [assignOpen, setAssignOpen] = useState(false);
  const [studentQuery, setStudentQuery] = useState('');
  const [studentHits, setStudentHits] = useState<Student[]>([]);
  const [chosenStudent, setChosenStudent] = useState<Student | null>(null);
  const [assignForm, setAssignForm] = useState({ routeId: '', stopId: '', monthlyFee: '600' });
  const [saving, setSaving] = useState(false);

  const loadRoutes = useCallback(() => {
    setLoading(true);
    api.transport
      .routes()
      .then(({ routes }) => setRoutes(routes))
      .finally(() => setLoading(false));
  }, []);
  const loadVehicles = useCallback(() => {
    setLoading(true);
    api.transport
      .vehicles()
      .then(({ vehicles }) => setVehicles(vehicles))
      .finally(() => setLoading(false));
  }, []);
  const loadAssignments = useCallback(() => {
    setLoading(true);
    api.transport
      .assignments()
      .then(({ assignments }) => setAssignments(assignments))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => {
      if (tab === 'routes') loadRoutes();
      else if (tab === 'vehicles') loadVehicles();
      else loadAssignments();
    });
  }, [tab, loadRoutes, loadVehicles, loadAssignments]);

  const act = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      if (tab === 'routes') loadRoutes();
      else if (tab === 'vehicles') loadVehicles();
      else loadAssignments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That action failed');
    }
  };

  // Debounced student search for the assign dialog.
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (studentQuery.trim().length < 2 || chosenStudent) {
      Promise.resolve().then(() => setStudentHits([]));
      return;
    }
    searchTimer.current = setTimeout(() => {
      api.students
        .list({ search: studentQuery.trim(), limit: 6, status: 'ACTIVE' })
        .then(({ students }) => setStudentHits(students));
    }, 250);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [studentQuery, chosenStudent]);

  const chosenRoute = routes.find((route) => route.id === assignForm.routeId);

  const createRoute = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.transport.createRoute({
        name: routeForm.name.trim(),
        description: routeForm.description.trim() || null,
      });
      setRouteFormOpen(false);
      setRouteForm({ name: '', description: '' });
      loadRoutes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the route');
    } finally {
      setSaving(false);
    }
  };

  const createStop = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.transport.addStop({
        routeId: stopRouteId,
        name: stopForm.name.trim(),
        sequence: Number(stopForm.sequence) || 1,
        pickupTime: stopForm.pickupTime || null,
        monthlyFee: Number(stopForm.monthlyFee) || 0,
      });
      setStopFormOpen(false);
      setStopForm({ name: '', sequence: '1', pickupTime: '', monthlyFee: '600' });
      loadRoutes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the stop');
    } finally {
      setSaving(false);
    }
  };

  const createVehicle = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.transport.createVehicle({
        regNo: vehicleForm.regNo.trim().toUpperCase(),
        model: vehicleForm.model.trim() || null,
        capacity: Number(vehicleForm.capacity) || 40,
        driverName: vehicleForm.driverName.trim() || null,
        driverPhone: vehicleForm.driverPhone.trim() || null,
        routeId: vehicleForm.routeId || null,
      });
      setVehicleFormOpen(false);
      setVehicleForm({
        regNo: '',
        model: '',
        capacity: '36',
        driverName: '',
        driverPhone: '',
        routeId: '',
      });
      loadVehicles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the vehicle');
    } finally {
      setSaving(false);
    }
  };

  const submitAssign = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!chosenStudent || !assignForm.routeId) return;
    setSaving(true);
    setError(null);
    try {
      await api.transport.assign({
        studentId: chosenStudent.id,
        routeId: assignForm.routeId,
        stopId: assignForm.stopId || null,
        monthlyFee: Number(assignForm.monthlyFee) || 0,
      });
      setAssignOpen(false);
      loadAssignments();
      loadRoutes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Assignment failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ConsoleHeader
        title="Transport"
        description="Routes, stops, vehicles and who rides them. Parents see their child’s route, stop and driver on the portal."
        actions={
          tab === 'routes' ? (
            <Button size="sm" onClick={() => setRouteFormOpen(true)}>
              <Plus className="h-4 w-4" />
              New route
            </Button>
          ) : tab === 'vehicles' ? (
            <Button size="sm" onClick={() => setVehicleFormOpen(true)}>
              <Plus className="h-4 w-4" />
              Add vehicle
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => {
                setAssignOpen(true);
                setChosenStudent(null);
                setStudentQuery('');
                setAssignForm({ routeId: routes[0]?.id ?? '', stopId: '', monthlyFee: '600' });
              }}
            >
              <Plus className="h-4 w-4" />
              Assign student
            </Button>
          )
        }
      />

      <div className="space-y-5 p-5 sm:p-8">
        <div
          className="flex gap-1 rounded-2xl border border-ink-100 bg-white p-1 shadow-soft sm:inline-flex"
          role="tablist"
          aria-label="Transport views"
        >
          {(
            [
              { id: 'routes', label: `Routes (${routes.length})` },
              { id: 'vehicles', label: `Vehicles (${vehicles.length})` },
              { id: 'assignments', label: `Riders (${assignments.length})` },
            ] as Array<{ id: Tab; label: string }>
          ).map((item) => (
            <button
              key={item.id}
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={cn(
                'rounded-xl px-4 py-2 text-xs font-semibold transition',
                tab === item.id ? 'bg-brand-700 text-white' : 'text-ink-500 hover:text-brand-800',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {error && (
          <p
            role="alert"
            className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-medium text-rose-700"
          >
            <AlertCircle className="h-4 w-4" aria-hidden />
            {error}
          </p>
        )}

        {/* Routes & stops */}
        {tab === 'routes' &&
          (loading ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-48 animate-pulse rounded-3xl bg-ink-100" />
              ))}
            </div>
          ) : routes.length === 0 ? (
            <EmptyState
              icon={RouteIcon}
              title="No routes yet"
              hint="Create a route, add stops with pickup times and monthly fees, then assign students."
              action={
                <Button size="sm" onClick={() => setRouteFormOpen(true)}>
                  <Plus className="h-4 w-4" />
                  New route
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {routes.map((route) => (
                <Panel
                  key={route.id}
                  title={route.name}
                  actions={
                    <button
                      aria-label={`Delete route ${route.name}`}
                      onClick={() => {
                        if (confirm(`Delete ${route.name}? Riders must be unassigned first.`))
                          act(() => api.transport.removeRoute(route.id));
                      }}
                      className="grid h-8 w-8 place-items-center rounded-lg text-ink-300 transition hover:bg-rose-50 hover:text-rose-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  }
                >
                  {route.description && (
                    <p className="-mt-2 mb-3 text-[11px] leading-5 text-ink-400">
                      {route.description}
                    </p>
                  )}
                  <ol className="space-y-1.5">
                    {route.stops.map((stop) => (
                      <li
                        key={stop.id}
                        className="flex items-center gap-2 rounded-2xl border border-ink-100 bg-frost px-3 py-2 text-xs"
                      >
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-800 font-display text-[10px] font-bold text-white">
                          {stop.sequence}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-medium text-ink-800">
                          {stop.name}
                        </span>
                        {stop.pickupTime && (
                          <span className="font-mono text-[10px] text-ink-400">
                            {stop.pickupTime}
                          </span>
                        )}
                        <span className="tabular-nums text-[11px] font-semibold text-ink-600">
                          {formatCurrency(stop.monthlyFee)}
                        </span>
                        <button
                          aria-label={`Delete stop ${stop.name}`}
                          onClick={() => {
                            if (confirm(`Delete stop ${stop.name}?`))
                              act(() => api.transport.removeStop(stop.id));
                          }}
                          className="grid h-6 w-6 place-items-center rounded-lg text-ink-300 transition hover:text-rose-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                    {route.stops.length === 0 && (
                      <li className="text-xs text-ink-400">No stops yet.</li>
                    )}
                  </ol>
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-ink-100 pt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">
                      {route._count?.assignments ?? 0} riders · {route.vehicles.length} vehicle(s)
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setStopRouteId(route.id);
                        setStopFormOpen(true);
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Stop
                    </Button>
                  </div>
                </Panel>
              ))}
            </div>
          ))}

        {/* Vehicles */}
        {tab === 'vehicles' &&
          (loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-2xl bg-ink-100" />
              ))}
            </div>
          ) : vehicles.length === 0 ? (
            <EmptyState
              icon={Truck}
              title="No vehicles"
              hint="Add the school bus with its registration and driver."
              action={
                <Button size="sm" onClick={() => setVehicleFormOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Add vehicle
                </Button>
              }
            />
          ) : (
            <Panel>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-[0.18em] text-ink-400">
                      <th className="pb-3 pe-3">Registration</th>
                      <th className="pb-3 pe-3">Model</th>
                      <th className="pb-3 pe-3 text-center">Capacity</th>
                      <th className="pb-3 pe-3">Driver</th>
                      <th className="pb-3 pe-3">Route</th>
                      <th className="pb-3 text-right">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {vehicles.map((vehicle) => (
                      <tr key={vehicle.id}>
                        <td className="py-2.5 pe-3 font-mono text-xs font-semibold text-ink-800">
                          {vehicle.regNo}
                        </td>
                        <td className="py-2.5 pe-3 text-ink-600">{vehicle.model ?? '—'}</td>
                        <td className="py-2.5 pe-3 text-center tabular-nums">{vehicle.capacity}</td>
                        <td className="py-2.5 pe-3 text-ink-700">
                          {vehicle.driverName ?? '—'}
                          <span className="block text-[10px] text-ink-400">
                            {vehicle.driverPhone ?? ''}
                          </span>
                        </td>
                        <td className="py-2.5 pe-3 text-ink-600">
                          {vehicle.route?.name ?? 'Unassigned'}
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            aria-label={`Delete vehicle ${vehicle.regNo}`}
                            onClick={() => {
                              if (confirm(`Delete ${vehicle.regNo}?`))
                                act(() => api.transport.removeVehicle(vehicle.id));
                            }}
                            className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 transition hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          ))}

        {/* Assignments */}
        {tab === 'assignments' &&
          (loading ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-2xl bg-ink-100" />
              ))}
            </div>
          ) : assignments.length === 0 ? (
            <EmptyState
              icon={Bus}
              title="No riders assigned"
              hint="Assign students to a route and stop — parents see it on the portal."
              action={
                <Button size="sm" onClick={() => setAssignOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Assign student
                </Button>
              }
            />
          ) : (
            <Panel>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-[0.18em] text-ink-400">
                      <th className="pb-3 pe-3">Student</th>
                      <th className="pb-3 pe-3">Route</th>
                      <th className="pb-3 pe-3">Stop</th>
                      <th className="pb-3 pe-3 text-right">Fee</th>
                      <th className="pb-3 text-right">Unassign</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {assignments.map((assignment) => (
                      <tr key={assignment.id}>
                        <td className="py-2.5 pe-3">
                          <p className="font-semibold text-ink-800">
                            {assignment.student.firstName} {assignment.student.lastName}
                          </p>
                          <p className="font-mono text-[10px] text-ink-400">
                            {assignment.student.admissionNo}
                          </p>
                        </td>
                        <td className="py-2.5 pe-3 text-ink-700">{assignment.route.name}</td>
                        <td className="py-2.5 pe-3 text-ink-600">
                          {assignment.stop?.name ?? 'Any stop'}
                        </td>
                        <td className="py-2.5 pe-3 text-right tabular-nums">
                          {formatCurrency(assignment.monthlyFee)}
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            aria-label="Unassign student"
                            onClick={() => {
                              if (confirm('Unassign from transport?'))
                                act(() => api.transport.unassign(assignment.student.id));
                            }}
                            className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 transition hover:bg-rose-50 hover:text-rose-600"
                          >
                            <UserRoundX className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          ))}
      </div>

      <TransportModals
        routeFormOpen={routeFormOpen}
        setRouteFormOpen={setRouteFormOpen}
        routeForm={routeForm}
        setRouteForm={setRouteForm}
        createRoute={createRoute}
        saving={saving}
        stopFormOpen={stopFormOpen}
        setStopFormOpen={setStopFormOpen}
        stopRouteId={stopRouteId}
        stopForm={stopForm}
        setStopForm={setStopForm}
        createStop={createStop}
        vehicleFormOpen={vehicleFormOpen}
        setVehicleFormOpen={setVehicleFormOpen}
        vehicleForm={vehicleForm}
        setVehicleForm={setVehicleForm}
        createVehicle={createVehicle}
        routes={routes}
        assignOpen={assignOpen}
        setAssignOpen={setAssignOpen}
        studentQuery={studentQuery}
        setStudentQuery={setStudentQuery}
        studentHits={studentHits}
        setStudentHits={setStudentHits}
        chosenStudent={chosenStudent}
        setChosenStudent={setChosenStudent}
        assignForm={assignForm}
        setAssignForm={setAssignForm}
        submitAssign={submitAssign}
        chosenRoute={chosenRoute}
      />
    </>
  );
}
