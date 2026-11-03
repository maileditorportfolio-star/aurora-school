import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import type { Route, Student, Vehicle } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Plus, Trash2, MapPin, Truck, UserRoundX } from 'lucide-react';

export interface TransportModalsProps {
  // route modal
  routeFormOpen: boolean;
  setRouteFormOpen: (v: boolean) => void;
  routeForm: { name: string; description: string };
  setRouteForm: (v: any) => void;
  createRoute: (e: React.FormEvent) => void;
  saving: boolean;
  // stop modal
  stopFormOpen: boolean;
  setStopFormOpen: (v: boolean) => void;
  stopRouteId: string;
  stopForm: { name: string; sequence: string; pickupTime: string; monthlyFee: string };
  setStopForm: (v: any) => void;
  createStop: (e: React.FormEvent) => void;
  // vehicle modal
  vehicleFormOpen: boolean;
  setVehicleFormOpen: (v: boolean) => void;
  vehicleForm: {
    regNo: string;
    model: string;
    capacity: string;
    driverName: string;
    driverPhone: string;
    routeId: string;
  };
  setVehicleForm: (v: any) => void;
  createVehicle: (e: React.FormEvent) => void;
  routes: Route[];
  // assign modal
  assignOpen: boolean;
  setAssignOpen: (v: boolean) => void;
  studentQuery: string;
  setStudentQuery: (v: string) => void;
  studentHits: Student[];
  setStudentHits: (v: Student[]) => void;
  chosenStudent: Student | null;
  setChosenStudent: (v: Student | null) => void;
  assignForm: { routeId: string; stopId: string; monthlyFee: string };
  setAssignForm: (v: any) => void;
  submitAssign: (e: React.FormEvent) => void;
  chosenRoute: Route | undefined;
}

export function TransportModals(props: TransportModalsProps) {
  const {
    routeFormOpen,
    setRouteFormOpen,
    routeForm,
    setRouteForm,
    createRoute,
    saving,
    stopFormOpen,
    setStopFormOpen,
    stopForm,
    setStopForm,
    createStop,
    vehicleFormOpen,
    setVehicleFormOpen,
    vehicleForm,
    setVehicleForm,
    createVehicle,
    routes,
    assignOpen,
    setAssignOpen,
    studentQuery,
    setStudentQuery,
    studentHits,
    setStudentHits,
    chosenStudent,
    setChosenStudent,
    assignForm,
    setAssignForm,
    submitAssign,
    chosenRoute,
  } = props;

  return (
    <>
      {/* Route modal */}
      <Modal open={routeFormOpen} onClose={() => setRouteFormOpen(false)} title="New route">
        <form onSubmit={createRoute} className="grid gap-4">
          <Input
            label="Route name"
            placeholder="Mirpur Route"
            value={routeForm.name}
            onChange={(e) => setRouteForm({ ...routeForm, name: e.target.value })}
            required
          />
          <Input
            label="Description (optional)"
            placeholder="Mirpur 10 → school"
            value={routeForm.description}
            onChange={(e) => setRouteForm({ ...routeForm, description: e.target.value })}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setRouteFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Create route
            </Button>
          </div>
        </form>
      </Modal>

      {/* Stop modal */}
      <Modal open={stopFormOpen} onClose={() => setStopFormOpen(false)} title="Add a stop">
        <form onSubmit={createStop} className="grid gap-4">
          <Input
            label="Stop name"
            placeholder="Mirpur 10"
            value={stopForm.name}
            onChange={(e) => setStopForm({ ...stopForm, name: e.target.value })}
            required
          />
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Sequence"
              type="number"
              min={1}
              value={stopForm.sequence}
              onChange={(e) => setStopForm({ ...stopForm, sequence: e.target.value })}
              required
            />
            <Input
              label="Pickup time"
              type="time"
              value={stopForm.pickupTime}
              onChange={(e) => setStopForm({ ...stopForm, pickupTime: e.target.value })}
            />
            <Input
              label="Monthly fee (৳)"
              type="number"
              min={0}
              value={stopForm.monthlyFee}
              onChange={(e) => setStopForm({ ...stopForm, monthlyFee: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setStopFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Add stop
            </Button>
          </div>
        </form>
      </Modal>

      {/* Vehicle modal */}
      <Modal open={vehicleFormOpen} onClose={() => setVehicleFormOpen(false)} title="Add a vehicle">
        <form onSubmit={createVehicle} className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Registration no"
              placeholder="DHAKA-GA-11-2345"
              value={vehicleForm.regNo}
              onChange={(e) => setVehicleForm({ ...vehicleForm, regNo: e.target.value })}
              required
            />
            <Input
              label="Model"
              placeholder="Hino Rosa"
              value={vehicleForm.model}
              onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Capacity"
              type="number"
              min={1}
              value={vehicleForm.capacity}
              onChange={(e) => setVehicleForm({ ...vehicleForm, capacity: e.target.value })}
            />
            <div>
              <label
                htmlFor="vehicle-route"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-500"
              >
                Route
              </label>
              <select
                id="vehicle-route"
                value={vehicleForm.routeId}
                onChange={(e) => setVehicleForm({ ...vehicleForm, routeId: e.target.value })}
                className="h-12 w-full rounded-2xl border border-ink-200 bg-white px-4 text-sm outline-none focus:border-brand-500"
              >
                <option value="">Unassigned</option>
                {routes.map((route) => (
                  <option key={route.id} value={route.id}>
                    {route.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Driver name"
              value={vehicleForm.driverName}
              onChange={(e) => setVehicleForm({ ...vehicleForm, driverName: e.target.value })}
            />
            <Input
              label="Driver phone"
              value={vehicleForm.driverPhone}
              onChange={(e) => setVehicleForm({ ...vehicleForm, driverPhone: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setVehicleFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Add vehicle
            </Button>
          </div>
        </form>
      </Modal>

      {/* Assign modal */}
      <Modal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title="Assign student to transport"
      >
        <form onSubmit={submitAssign} className="grid gap-4">
          <div className="relative">
            <Input
              label="Student"
              placeholder="Type at least 2 characters…"
              value={
                chosenStudent
                  ? `${chosenStudent.firstName} ${chosenStudent.lastName} (${chosenStudent.admissionNo})`
                  : studentQuery
              }
              onChange={(event) => {
                setChosenStudent(null);
                setStudentQuery(event.target.value);
              }}
            />
            {studentHits.length > 0 && !chosenStudent && (
              <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-lift">
                {studentHits.map((student) => (
                  <li key={student.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setChosenStudent(student);
                        setStudentHits([]);
                      }}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left text-xs transition hover:bg-brand-50"
                    >
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-800">
                        {student.firstName.charAt(0)}
                        {student.lastName.charAt(0)}
                      </span>
                      <span>
                        {student.firstName} {student.lastName}
                        <span className="block font-mono text-[9px] text-ink-400">
                          {student.admissionNo}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label
              htmlFor="assign-route"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-500"
            >
              Route
            </label>
            <select
              id="assign-route"
              value={assignForm.routeId}
              onChange={(e) =>
                setAssignForm({ ...assignForm, routeId: e.target.value, stopId: '' })
              }
              className="h-12 w-full rounded-2xl border border-ink-200 bg-white px-4 text-sm outline-none focus:border-brand-500"
              required
            >
              <option value="">Select a route…</option>
              {routes.map((route) => (
                <option key={route.id} value={route.id}>
                  {route.name}
                </option>
              ))}
            </select>
          </div>

          {chosenRoute && (
            <div>
              <label
                htmlFor="assign-stop"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-500"
              >
                Stop
              </label>
              <select
                id="assign-stop"
                value={assignForm.stopId}
                onChange={(e) => {
                  const stop = chosenRoute.stops.find((row) => row.id === e.target.value);
                  setAssignForm({
                    ...assignForm,
                    stopId: e.target.value,
                    monthlyFee: stop ? String(stop.monthlyFee) : assignForm.monthlyFee,
                  });
                }}
                className="h-12 w-full rounded-2xl border border-ink-200 bg-white px-4 text-sm outline-none focus:border-brand-500"
              >
                <option value="">No fixed stop</option>
                {chosenRoute.stops.map((stop) => (
                  <option key={stop.id} value={stop.id}>
                    {stop.sequence}. {stop.name} ({stop.pickupTime}) —{' '}
                    {formatCurrency(stop.monthlyFee)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Input
            label="Monthly fee (৳)"
            type="number"
            min={0}
            value={assignForm.monthlyFee}
            onChange={(e) => setAssignForm({ ...assignForm, monthlyFee: e.target.value })}
          />

          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setAssignOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} disabled={!chosenStudent || !assignForm.routeId}>
              Assign
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
