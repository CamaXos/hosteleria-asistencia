"use client";

import { useState, useEffect, useCallback } from "react";
import { CalendarDays } from "lucide-react";
import { getMonthlyAttendance } from "@/lib/actions/attendance";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  ATTENDANCE_STATUS_CODES,
  ATTENDANCE_STATUS_LABELS,
  ALL_ATTENDANCE_STATUSES,
} from "@/lib/constants";
import {
  generateMonthlyCSV,
  downloadCSV,
  generateMonthlyExcel,
  downloadExcel,
} from "@/lib/utils/attendance-export";
import { getMonthDays } from "@/lib/utils";
import type { AttendanceStatus, Center, Employee, MonthlyAttendanceRow } from "@/lib/types/database";

interface MonthlyGridProps {
  centers: Center[];
  employees: Employee[];
  title?: string;
  description?: string;
  sectionId?: string;
  embedded?: boolean;
  year?: number;
  month?: number;
  centerId?: string;
}

export function MonthlyGrid({
  centers,
  employees,
  title = "Cuadrícula mensual",
  description = "Vista de asistencia por empleado y día",
  sectionId,
  embedded = false,
  year: controlledYear,
  month: controlledMonth,
  centerId: controlledCenterId,
}: MonthlyGridProps) {
  const now = new Date();
  const [internalYear, setInternalYear] = useState(now.getFullYear());
  const [internalMonth, setInternalMonth] = useState(now.getMonth() + 1);
  const [internalCenterId, setInternalCenterId] = useState(centers[0]?.id || "");

  const year = controlledYear ?? internalYear;
  const month = controlledMonth ?? internalMonth;
  const centerId = controlledCenterId ?? internalCenterId;

  const [employeeFilter, setEmployeeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [rows, setRows] = useState<MonthlyAttendanceRow[]>([]);
  const [loading, setLoading] = useState(false);

  const daysInMonth = getMonthDays(year, month);
  const centerName = centers.find((c) => c.id === centerId)?.name || "";

  const loadData = useCallback(async () => {
    if (!centerId) return;
    setLoading(true);
    try {
      const data = await getMonthlyAttendance(
        centerId,
        year,
        month,
        employeeFilter || undefined,
        (statusFilter as AttendanceStatus) || undefined
      );
      setRows(data);
    } finally {
      setLoading(false);
    }
  }, [centerId, year, month, employeeFilter, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: new Date(2000, i).toLocaleString("es", { month: "long" }),
  }));

  const yearOptions = Array.from({ length: 5 }, (_, i) => ({
    value: String(now.getFullYear() - 2 + i),
    label: String(now.getFullYear() - 2 + i),
  }));

  const centerEmployees = employees.filter((e) => e.center_id === centerId);

  function handleExportCSV() {
    const csv = generateMonthlyCSV(rows, year, month, centerName);
    downloadCSV(csv, `asistencia_${centerName}_${month}_${year}.csv`);
  }

  async function handleExportExcel() {
    const buffer = await generateMonthlyExcel(rows, year, month, centerName);
    downloadExcel(buffer, `asistencia_${centerName}_${month}_${year}.xlsx`);
  }

  const HeadingTag = embedded ? "h2" : sectionId ? "h2" : "h1";

  return (
    <div id={sectionId} className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          {embedded && (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-light)] text-[var(--primary)]">
              <CalendarDays className="h-4 w-4" />
            </div>
          )}
          <div>
            <HeadingTag className={embedded ? "text-lg font-semibold text-slate-900" : "text-2xl font-bold text-slate-900"}>
              {title}
            </HeadingTag>
            <p className="text-sm text-slate-500">{description}</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={rows.length === 0}>
            Exportar CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={rows.length === 0}>
            Exportar Excel
          </Button>
        </div>
      </div>

      {!embedded && (
        <Card>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Select
              label="Centro"
              options={centers.filter((c) => c.active).map((c) => ({ value: c.id, label: c.name }))}
              value={centerId}
              onChange={(e) => setInternalCenterId(e.target.value)}
            />
            <Select
              label="Mes"
              options={monthOptions}
              value={String(month)}
              onChange={(e) => setInternalMonth(Number(e.target.value))}
            />
            <Select
              label="Año"
              options={yearOptions}
              value={String(year)}
              onChange={(e) => setInternalYear(Number(e.target.value))}
            />
          </div>
        </Card>
      )}

      <Card>
        <div className="mb-4 grid gap-4 border-b border-slate-100 pb-4 sm:grid-cols-2">
          <Select
            label="Empleado"
            options={[
              { value: "", label: "Todos" },
              ...centerEmployees.map((e) => ({ value: e.id, label: e.full_name })),
            ]}
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
          />
          <Select
            label="Estado"
            options={[
              { value: "", label: "Todos" },
              ...ALL_ATTENDANCE_STATUSES.map((s) => ({
                value: s,
                label: ATTENDANCE_STATUS_LABELS[s],
              })),
            ]}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Cargando...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-500">No hay datos para este período.</p>
        ) : (
          <div className="overflow-x-auto -mx-5 sm:-mx-6">
            <table className="text-xs">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="sticky left-0 bg-white pb-2 pr-3 min-w-[140px] px-5 sm:px-6">Empleado</th>
                  {Array.from({ length: daysInMonth }, (_, i) => (
                    <th key={i + 1} className="pb-2 px-1 text-center w-8">{i + 1}</th>
                  ))}
                  {ALL_ATTENDANCE_STATUSES.map((s) => (
                    <th key={s} className="pb-2 px-1 text-center w-8" title={ATTENDANCE_STATUS_LABELS[s]}>
                      {ATTENDANCE_STATUS_CODES[s]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.employee.id} className="border-b border-slate-50">
                    <td className="sticky left-0 bg-white py-2 pr-3 font-medium whitespace-nowrap px-5 sm:px-6">
                      {row.employee.full_name}
                    </td>
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const status = row.days[i + 1];
                      return (
                        <td key={i + 1} className="py-2 px-1 text-center">
                          {status ? (
                            <StatusBadge status={status} />
                          ) : (
                            <span className="text-slate-300">·</span>
                          )}
                        </td>
                      );
                    })}
                    {ALL_ATTENDANCE_STATUSES.map((s) => (
                      <td key={s} className="py-2 px-1 text-center font-medium">
                        {row.totals[s] || 0}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Leyenda" description="Códigos de estado de asistencia">
        <div className="flex flex-wrap gap-3">
          {ALL_ATTENDANCE_STATUSES.map((s) => (
            <StatusBadge key={s} status={s} showLabel />
          ))}
        </div>
      </Card>
    </div>
  );
}
