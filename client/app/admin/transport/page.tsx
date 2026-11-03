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
import { TransportTabs } from '@/components/transport/transport-tabs';

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

  const ctx = {
    tab,
    setTab,
    routes,
    vehicles,
    assignments,
    loading,
    error,
    setError,
    act,
    loadRoutes,
    loadVehicles,
    loadAssignments,
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
        )}{' '}
        <TransportTabs ctx={ctx} />
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
