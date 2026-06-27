"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Card, KpiCard } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import {
  getResponsibleSubmissionHistory,
  type ResponsibleSubmissionEntry,
  type ResponsibleSubmissionSummary,
} from "@/lib/actions/responsible-stats";
import { ResponsibleMonthCalendar } from "@/components/admin/ResponsibleMonthCalendar";
import { ArrowLeft } from "lucide-react";

interface ResponsibleHistoryViewProps {
  responsibleId: string;
  responsibleName: string;
  centerNames: string[];
  initialEntries: ResponsibleSubmissionEntry[];
  initialSummary: ResponsibleSubmissionSummary;
  initialYear: number;
  initialMonth: number;
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

const EMPTY_SUMMARY: ResponsibleSubmissionSummary = {
  submitted: 0,
  pending: 0,
  off: 0,
  future: 0,
};

function statusBadge(entry: ResponsibleSubmissionEntry) {
  switch (entry.status) {
    case "submitted":
      return <Badge variant="success">Enviado</Badge>;
    case "pending":
      return <Badge variant="danger">Pendiente</Badge>;
    case "future":
      return <Badge variant="default">Futuro</Badge>;
    default:
      return <Badge variant="default">Día libre</Badge>;
  }
}

export function ResponsibleHistoryView({
  responsibleId,
  responsibleName,
  centerNames,
  initialEntries,
  initialSummary,
  initialYear,
  initialMonth,
}: ResponsibleHistoryViewProps) {
  const now = new Date();
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [entries, setEntries] = useState(initialEntries);
  const [summary, setSummary] = useState(initialSummary);
  const [isPending, startTransition] = useTransition();

  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i);
  const monthLabel = MONTHS.find((m) => Number(m.value) === month)?.label ?? "";

  const tableEntries = entries.filter((e) => e.status !== "off" && e.status !== "future");

  function handleFilter() {
    startTransition(async () => {
      try {
        const result = await getResponsibleSubmissionHistory(responsibleId, year, month);
        setEntries(result.entries);
        setSummary(result.summary);
      } catch {
        setEntries([]);
        setSummary({ ...EMPTY_SUMMARY });
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/admin/responsibles"
            className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a responsables
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">{responsibleName}</h1>
          <p className="text-sm text-slate-500">
            Historial de partes · {centerNames.length > 0 ? centerNames.join(", ") : "Sin centros asignados"}
          </p>
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

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <KpiCard label="Partes enviados" value={summary.submitted} variant="success" />
        <KpiCard label="Sin parte (pendiente)" value={summary.pending} variant="danger" />
        <KpiCard label="Días libres" value={summary.off} variant="default" />
        <KpiCard label="Futuros" value={summary.future} variant="default" />
      </div>

      <ResponsibleMonthCalendar
        year={year}
        month={month}
        monthLabel={monthLabel}
        entries={entries}
      />

      <Card title="Detalle del mes" description={`${tableEntries.length} registros laborables`}>
        {tableEntries.length === 0 ? (
          <p className="text-sm text-slate-500">Sin registros laborables para este mes.</p>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-slate-500">
                    <th className="pb-2 pr-4">Fecha</th>
                    <th className="pb-2 pr-4">Centro</th>
                    <th className="pb-2 pr-4">Estado</th>
                    <th className="pb-2">Hora envío</th>
                  </tr>
                </thead>
                <tbody>
                  {tableEntries.map((e) => (
                    <tr key={`${e.date}-${e.centerId}`} className="border-b border-slate-50">
                      <td className="py-3 pr-4">{formatDate(e.date)}</td>
                      <td className="py-3 pr-4 text-slate-600">{e.centerName}</td>
                      <td className="py-3 pr-4">{statusBadge(e)}</td>
                      <td className="py-3 text-slate-500">{e.submittedTime ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-2 md:hidden">
              {tableEntries.map((e) => (
                <div
                  key={`${e.date}-${e.centerId}`}
                  className="rounded-lg border border-slate-100 px-3 py-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900">{formatDate(e.date)}</span>
                    {statusBadge(e)}
                  </div>
                  <p className="text-xs text-slate-500">{e.centerName}</p>
                  {e.submittedTime && (
                    <p className="mt-1 text-xs text-emerald-600">Enviado a las {e.submittedTime}</p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
