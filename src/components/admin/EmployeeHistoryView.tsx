"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Card, KpiCard } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDate } from "@/lib/utils";
import {
  ATTENDANCE_STATUS_CODES,
  ATTENDANCE_STATUS_LABELS,
} from "@/lib/constants";
import type {
  EmployeeHistoryEntry,
  EmployeeHistorySummary,
} from "@/lib/actions/responsible-stats";
import type { AttendanceStatus } from "@/lib/types/database";
import { ArrowLeft } from "lucide-react";

interface EmployeeHistoryViewProps {
  employeeId: string;
  employeeName: string;
  centerName: string;
  initialEntries: EmployeeHistoryEntry[];
  initialSummary: EmployeeHistorySummary;
  initialYear: number;
  initialMonth: number;
  onMonthChange: (year: number, month: number) => Promise<{
    entries: EmployeeHistoryEntry[];
    summary: EmployeeHistorySummary;
  }>;
}

const MONTHS = [
  { value: "1", label: "Enero" },
  { value: "2", label: "Febrero" },
  { value: "3", label: "Marzo" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Mayo" },
  { value: "6", label: "Junio" },
  { value: "7", label: "Julio" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
];

const SUMMARY_STATUSES: AttendanceStatus[] = [
  "worked",
  "day_off",
  "vacation",
  "absence",
  "sick",
  "inactive",
  "other",
];

export function EmployeeHistoryView({
  employeeId,
  employeeName,
  centerName,
  initialEntries,
  initialSummary,
  initialYear,
  initialMonth,
  onMonthChange,
}: EmployeeHistoryViewProps) {
  const now = new Date();
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [entries, setEntries] = useState(initialEntries);
  const [summary, setSummary] = useState(initialSummary);
  const [isPending, startTransition] = useTransition();

  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i);

  function handleFilter() {
    startTransition(async () => {
      const result = await onMonthChange(year, month);
      setEntries(result.entries);
      setSummary(result.summary);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/admin/employees"
            className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a empleados
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">{employeeName}</h1>
          <p className="text-sm text-slate-500">Historial de asistencia · {centerName}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Select
          label="Año"
          value={String(year)}
          onChange={(e) => setYear(Number(e.target.value))}
          options={years.map((y) => ({ value: String(y), label: String(y) }))}
        />
        <Select
          label="Mes"
          value={String(month)}
          onChange={(e) => setMonth(Number(e.target.value))}
          options={MONTHS}
        />
        <Button onClick={handleFilter} loading={isPending} size="sm">
          Filtrar
        </Button>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-7">
        {SUMMARY_STATUSES.map((status) => (
          <KpiCard
            key={status}
            label={`${ATTENDANCE_STATUS_CODES[status]} · ${ATTENDANCE_STATUS_LABELS[status]}`}
            value={summary[status]}
            variant={
              status === "worked"
                ? "success"
                : status === "absence" || status === "sick"
                  ? "danger"
                  : "default"
            }
          />
        ))}
      </div>

      <Card title="Registros del mes" description={`${entries.length} entradas`}>
        {entries.length === 0 ? (
          <p className="text-sm text-slate-500">Sin registros para este mes.</p>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-slate-500">
                    <th className="pb-2 pr-4">Fecha</th>
                    <th className="pb-2 pr-4">Centro</th>
                    <th className="pb-2 pr-4">Estado</th>
                    <th className="pb-2">Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      <td className="py-3 pr-4">{formatDate(e.date)}</td>
                      <td className="py-3 pr-4 text-slate-600">{e.centerName}</td>
                      <td className="py-3 pr-4">
                        <StatusBadge status={e.status} showLabel />
                      </td>
                      <td className="py-3 text-slate-500">{e.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-2 md:hidden">
              {entries.map((e, i) => (
                <div key={i} className="rounded-lg border border-slate-100 px-3 py-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900">{formatDate(e.date)}</span>
                    <StatusBadge status={e.status} />
                  </div>
                  <p className="text-xs text-slate-500">{e.centerName}</p>
                  {e.notes && <p className="mt-1 text-xs text-slate-400">{e.notes}</p>}
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
