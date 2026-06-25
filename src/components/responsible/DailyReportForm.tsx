"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  getActiveEmployeesForCenter,
  submitAttendanceReport,
} from "@/lib/actions/attendance";
import { createEmployee, deactivateEmployee } from "@/lib/actions/employees";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Alert";
import { Textarea } from "@/components/ui/Textarea";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ATTENDANCE_STATUS_LABELS } from "@/lib/constants";
import { formatDateLong, getTodayISO, getErrorMessage } from "@/lib/utils";
import type { AttendanceEntryInput, AttendanceStatus, Center, Employee } from "@/lib/types/database";

const RESPONSIBLE_STATUSES: AttendanceStatus[] = [
  "worked", "day_off", "vacation", "absence", "sick", "other",
];

interface DailyReportFormProps {
  center: Center;
  initialEmployees: Employee[];
  alreadySubmitted: boolean;
}

export function DailyReportForm({
  center,
  initialEmployees,
  alreadySubmitted,
}: DailyReportFormProps) {
  const router = useRouter();
  const [employees, setEmployees] = useState(initialEmployees);
  const [entries, setEntries] = useState<Record<string, AttendanceEntryInput>>(() => {
    const init: Record<string, AttendanceEntryInput> = {};
    initialEmployees.forEach((emp) => {
      init[emp.id] = { employee_id: emp.id, status: "worked", notes: null };
    });
    return init;
  });
  const [showSummary, setShowSummary] = useState(false);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [deactivating, setDeactivating] = useState<Employee | null>(null);
  const [reportNotes, setReportNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (alreadySubmitted) {
    return (
      <div className="space-y-4">
        <Alert variant="success">
          El control de asistencia de hoy ya ha sido enviado para este centro.
        </Alert>
        <Button variant="outline" onClick={() => router.push("/responsible")}>
          Volver a centros
        </Button>
      </div>
    );
  }

  function setStatus(employeeId: string, status: AttendanceStatus) {
    setEntries((prev) => ({
      ...prev,
      [employeeId]: { ...prev[employeeId], status },
    }));
  }

  function setNotes(employeeId: string, notes: string) {
    setEntries((prev) => ({
      ...prev,
      [employeeId]: { ...prev[employeeId], notes: notes || null },
    }));
  }

  const statusCounts = RESPONSIBLE_STATUSES.reduce(
    (acc, s) => {
      acc[s] = Object.values(entries).filter((e) => e.status === s).length;
      return acc;
    },
    {} as Record<AttendanceStatus, number>
  );

  async function handleSubmit() {
    setLoading(true);
    setError("");
    try {
      await submitAttendanceReport(
        center.id,
        Object.values(entries),
        reportNotes || undefined
      );
      router.push("/responsible");
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err));
      setShowSummary(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddEmployee(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set("center_id", center.id);
    try {
      const emp = await createEmployee(formData);
      const updated = await getActiveEmployeesForCenter(center.id);
      setEmployees(updated);
      setEntries((prev) => ({
        ...prev,
        [emp.id]: { employee_id: emp.id, status: "worked", notes: null },
      }));
      setShowAddEmployee(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleDeactivate() {
    if (!deactivating) return;
    setLoading(true);
    try {
      await deactivateEmployee(deactivating.id);
      const updated = await getActiveEmployeesForCenter(center.id);
      setEmployees(updated);
      setEntries((prev) => {
        const next = { ...prev };
        delete next[deactivating.id];
        return next;
      });
      setDeactivating(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{center.name}</h1>
        <p className="text-sm text-gray-500">{formatDateLong(getTodayISO())}</p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setShowAddEmployee(true)}>
          + Alta empleado
        </Button>
        <Button variant="outline" onClick={() => router.push("/responsible")}>
          Cambiar centro
        </Button>
      </div>

      <div className="space-y-3">
        {employees.map((emp) => (
          <Card key={emp.id} className="!p-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{emp.full_name}</p>
                  {emp.position && <p className="text-xs text-gray-500">{emp.position}</p>}
                </div>
                <Button variant="ghost" size="sm" onClick={() => setDeactivating(emp)}>
                  Baja
                </Button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {RESPONSIBLE_STATUSES.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatus(emp.id, status)}
                    className={`rounded-lg border-2 px-2 py-3 text-center transition-all ${
                      entries[emp.id]?.status === status
                        ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <StatusBadge status={status} />
                    <p className="mt-1 text-xs text-gray-600">{ATTENDANCE_STATUS_LABELS[status]}</p>
                  </button>
                ))}
              </div>
              <Textarea
                label="Notas (opcional)"
                rows={2}
                value={entries[emp.id]?.notes || ""}
                onChange={(e) => setNotes(emp.id, e.target.value)}
                placeholder="Observaciones sobre este empleado..."
              />
            </div>
          </Card>
        ))}
      </div>

      {employees.length === 0 && (
        <Alert variant="warning">
          No hay empleados activos en este centro. Añade empleados antes de enviar el informe.
        </Alert>
      )}

      <Button
        size="lg"
        className="w-full"
        disabled={employees.length === 0}
        onClick={() => setShowSummary(true)}
      >
        Revisar y enviar informe
      </Button>

      <Modal
        open={showSummary}
        onClose={() => setShowSummary(false)}
        title="Resumen del informe"
        onConfirm={handleSubmit}
        confirmLabel="Confirmar y enviar"
        loading={loading}
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Centro: <strong>{center.name}</strong> — {formatDateLong(getTodayISO())}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {RESPONSIBLE_STATUSES.map((s) => (
              <div key={s} className="rounded-lg bg-gray-50 p-3 text-center">
                <StatusBadge status={s} />
                <p className="mt-1 text-lg font-bold">{statusCounts[s]}</p>
                <p className="text-xs text-gray-500">{ATTENDANCE_STATUS_LABELS[s]}</p>
              </div>
            ))}
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1 text-sm">
            {employees.map((emp) => (
              <div key={emp.id} className="flex justify-between border-b border-gray-50 py-1">
                <span>{emp.full_name}</span>
                <StatusBadge status={entries[emp.id]?.status || "worked"} showLabel />
              </div>
            ))}
          </div>
          <Textarea
            label="Notas generales (opcional)"
            value={reportNotes}
            onChange={(e) => setReportNotes(e.target.value)}
            rows={2}
          />
          <Alert variant="warning">
            Una vez enviado, el informe no se podrá modificar.
          </Alert>
        </div>
      </Modal>

      <Modal open={showAddEmployee} onClose={() => setShowAddEmployee(false)} title="Alta de empleado">
        <form onSubmit={handleAddEmployee} className="space-y-4">
          <Input name="full_name" label="Nombre completo" required />
          <Input name="position" label="Puesto" />
          <Input name="dni_nie" label="DNI/NIE" />
          <Input name="phone" label="Teléfono" />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setShowAddEmployee(false)}>Cancelar</Button>
            <Button type="submit" loading={loading}>Crear empleado</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!deactivating}
        onClose={() => setDeactivating(null)}
        title="Confirmar baja"
        onConfirm={handleDeactivate}
        confirmLabel="Dar de baja"
        variant="danger"
        loading={loading}
      >
        <p className="text-sm text-gray-600">
          ¿Dar de baja a <strong>{deactivating?.full_name}</strong>?
        </p>
      </Modal>
    </div>
  );
}
