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
import { ArrowLeft, CheckCircle2, Send, UserPlus } from "lucide-react";
import type { AttendanceEntryInput, AttendanceStatus, Center, Employee } from "@/lib/types/database";

type SubmitReportFn = (
  centerId: string,
  entries: AttendanceEntryInput[],
  notes?: string,
  reportDate?: string
) => Promise<string>;

const RESPONSIBLE_STATUSES: AttendanceStatus[] = [
  "worked", "day_off", "vacation", "absence", "sick", "other",
];

const STATUS_BUTTON_COLORS: Record<AttendanceStatus, string> = {
  worked: "border-emerald-300 bg-emerald-50 text-emerald-800",
  day_off: "border-blue-300 bg-blue-50 text-blue-800",
  vacation: "border-purple-300 bg-purple-50 text-purple-800",
  absence: "border-red-300 bg-red-50 text-red-800",
  sick: "border-amber-300 bg-amber-50 text-amber-800",
  inactive: "border-slate-300 bg-slate-50 text-slate-600",
  other: "border-yellow-300 bg-yellow-50 text-yellow-800",
};

interface DailyReportFormProps {
  center: Center;
  initialEmployees: Employee[];
  alreadySubmitted: boolean;
  reportDate?: string;
  backHref?: string;
  successHref?: string;
  showEmployeeManagement?: boolean;
  submitReport?: SubmitReportFn;
  submittedMessage?: string;
}

export function DailyReportForm({
  center,
  initialEmployees,
  alreadySubmitted,
  reportDate = getTodayISO(),
  backHref = "/responsible",
  successHref = "/responsible?success=1",
  showEmployeeManagement = true,
  submitReport = (centerId, entries, notes) => submitAttendanceReport(centerId, entries, notes),
  submittedMessage = "El control de asistencia de hoy ya ha sido enviado para este centro.",
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
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-9 w-9 text-emerald-600" />
        </div>
        <Alert variant="success">{submittedMessage}</Alert>
        <Button variant="outline" className="w-full" onClick={() => router.push(backHref)}>
          <ArrowLeft className="h-4 w-4" />
          Volver
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
      await submitReport(
        center.id,
        Object.values(entries),
        reportNotes || undefined,
        reportDate
      );
      router.push(successHref);
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
    <div className="space-y-5">
      <div>
        <button
          onClick={() => router.push(backHref)}
          className="mb-3 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </button>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{center.name}</h1>
        <p className="text-sm text-slate-500">{formatDateLong(reportDate)}</p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {showEmployeeManagement && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowAddEmployee(true)}>
            <UserPlus className="h-4 w-4" />
            Alta empleado
          </Button>
        </div>
      )}

      <div className="space-y-4">
        {employees.map((emp) => (
          <Card key={emp.id} noPadding className="overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{emp.full_name}</p>
                  {emp.position && <p className="text-xs text-slate-500">{emp.position}</p>}
                </div>
                {showEmployeeManagement && (
                  <Button variant="ghost" size="sm" onClick={() => setDeactivating(emp)}>
                    Baja
                  </Button>
                )}
              </div>
            </div>
            <div className="p-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Estado</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {RESPONSIBLE_STATUSES.map((status) => {
                  const selected = entries[emp.id]?.status === status;
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setStatus(emp.id, status)}
                      className={`rounded-xl border-2 px-2 py-3 text-center transition-all touch-target ${
                        selected
                          ? `${STATUS_BUTTON_COLORS[status]} ring-2 ring-offset-1 ring-slate-300 scale-[1.02]`
                          : "border-slate-200 bg-white hover:border-slate-300 active:bg-slate-50"
                      }`}
                    >
                      <StatusBadge status={status} />
                      <p className="mt-1.5 text-xs font-medium text-slate-700">
                        {ATTENDANCE_STATUS_LABELS[status]}
                      </p>
                    </button>
                  );
                })}
              </div>
              <Textarea
                label="Notas (opcional)"
                rows={2}
                className="mt-3"
                value={entries[emp.id]?.notes || ""}
                onChange={(e) => setNotes(emp.id, e.target.value)}
                placeholder="Observaciones..."
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

      {/* Sticky submit bar */}
      <div className={`fixed left-0 right-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-sm ${showEmployeeManagement ? "bottom-16" : "bottom-0"}`}>
        <div className="mx-auto max-w-2xl">
          <Button
            variant="accent"
            size="lg"
            className="w-full shadow-lg"
            disabled={employees.length === 0}
            onClick={() => setShowSummary(true)}
          >
            <Send className="h-4 w-4" />
            Revisar y enviar informe
          </Button>
        </div>
      </div>

      <Modal
        open={showSummary}
        onClose={() => setShowSummary(false)}
        title="Confirmar envío"
        onConfirm={handleSubmit}
        confirmLabel="Confirmar y enviar"
        loading={loading}
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Centro: <strong>{center.name}</strong> — {formatDateLong(reportDate)}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {RESPONSIBLE_STATUSES.map((s) => (
              <div key={s} className="rounded-xl bg-slate-50 p-3 text-center">
                <StatusBadge status={s} />
                <p className="mt-1 text-xl font-bold text-slate-900">{statusCounts[s]}</p>
                <p className="text-xs text-slate-500">{ATTENDANCE_STATUS_LABELS[s]}</p>
              </div>
            ))}
          </div>
          <div className="max-h-48 space-y-1 overflow-y-auto text-sm">
            {employees.map((emp) => (
              <div key={emp.id} className="flex justify-between border-b border-slate-50 py-2">
                <span className="font-medium">{emp.full_name}</span>
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

      {showEmployeeManagement && (
        <>
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
            <p className="text-sm text-slate-600">
              ¿Dar de baja a <strong>{deactivating?.full_name}</strong>?
            </p>
          </Modal>
        </>
      )}
    </div>
  );
}
