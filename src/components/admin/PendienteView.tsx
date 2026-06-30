"use client";

import Link from "next/link";
import { Card, KpiCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DailySummaryCalendar } from "@/components/admin/DailySummaryCalendar";
import { formatDateLong } from "@/lib/utils";
import type { MonthReportDay, TodayOverview } from "@/lib/actions/today";
import { AlertTriangle, Building2, CheckCircle2, Users } from "lucide-react";

interface PendienteViewProps {
  data: TodayOverview;
  selectedDate: string;
  reportDays: MonthReportDay[];
}

export function PendienteView({ data, selectedDate, reportDays }: PendienteViewProps) {
  const reportHref = (centerId: string) =>
    `/admin/pendiente/${centerId}?date=${selectedDate}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pendiente</h1>
        <p className="mt-1 text-sm text-slate-500">
          Centros sin parte enviado · <span className="capitalize">{formatDateLong(data.dateISO)}</span>
        </p>
      </div>

      <DailySummaryCalendar
        selectedDate={selectedDate}
        selectedCenter={null}
        initialReportDays={reportDays}
        basePath="/admin/pendiente"
      />

      <KpiCard
        label="Centros pendientes"
        value={data.pendingCenters.length}
        variant={data.pendingCenters.length > 0 ? "warning" : "success"}
        icon={<AlertTriangle className="h-5 w-5" />}
      />

      {data.pendingCenters.length > 0 ? (
        <div className="space-y-3">
          {data.pendingCenters.map((center) => (
            <Card
              key={center.id}
              noPadding
              className="overflow-hidden border-amber-200 bg-amber-50/30"
            >
              <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100">
                    <Building2 className="h-5 w-5 text-amber-700" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-slate-900">{center.name}</h2>
                      <Badge variant="warning">Sin parte</Badge>
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
                      <Users className="h-4 w-4 text-slate-400" />
                      {center.employeeCount} empleado{center.employeeCount !== 1 ? "s" : ""} activo{center.employeeCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <Link href={reportHref(center.id)} className="shrink-0">
                  <Button variant="accent" className="w-full sm:w-auto">
                    Completar parte
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-emerald-200 bg-emerald-50/40">
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-600" />
            <div>
              <p className="text-lg font-semibold text-emerald-900">Todo al día</p>
              <p className="mt-1 text-sm text-emerald-700">
                Todos los centros han enviado el parte para este día.
              </p>
            </div>
            <Link href={`/admin/resumen-diario?date=${selectedDate}`}>
              <Button variant="outline" size="sm">
                Ver resumen diario
              </Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
