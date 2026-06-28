"use client";

import { Card, KpiCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DailySummaryCalendar } from "@/components/admin/DailySummaryCalendar";
import { DailySummaryCenterFilter } from "@/components/admin/DailySummaryCenterFilter";
import { formatDateLong, formatDateTime, formatTime } from "@/lib/utils";
import type { MonthReportDay, TodayOverview } from "@/lib/actions/today";
import {
  Users,
  CheckCircle2,
  UserX,
  HeartPulse,
  Palmtree,
  CalendarOff,
  AlertTriangle,
  Clock,
  Building2,
  FileCheck,
  UserCog,
} from "lucide-react";

interface DailySummaryViewProps {
  data: TodayOverview;
  selectedDate: string;
  selectedCenter: string | null;
  reportDays: MonthReportDay[];
}

export function DailySummaryView({
  data,
  selectedDate,
  selectedCenter,
  reportDays,
}: DailySummaryViewProps) {
  const selectedCenterName = selectedCenter
    ? data.activeCenters.find((c) => c.id === selectedCenter)?.name
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Resumen diario</h1>
        <p className="mt-1 text-sm capitalize text-slate-500">
          {formatDateLong(data.dateISO)}
        </p>
      </div>

      <DailySummaryCalendar
        selectedDate={selectedDate}
        selectedCenter={selectedCenter}
        initialReportDays={reportDays}
      />

      {data.activeCenters.length > 0 && (
        <DailySummaryCenterFilter
          centers={data.activeCenters}
          selectedCenter={selectedCenter}
          selectedDate={selectedDate}
        />
      )}

      {selectedCenterName && (
        <p className="text-sm text-slate-600">
          Mostrando datos de <span className="font-medium text-[var(--primary)]">{selectedCenterName}</span>
        </p>
      )}

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-9">
        <KpiCard label="Empleados activos" value={data.kpis.activeEmployees} icon={<Users className="h-5 w-5" />} />
        <KpiCard label="Asistieron" value={data.kpis.workedToday} variant="success" icon={<CheckCircle2 className="h-5 w-5" />} />
        <KpiCard label="Faltas" value={data.kpis.absences} variant="danger" icon={<UserX className="h-5 w-5" />} />
        <KpiCard label="Enfermedad" value={data.kpis.sick} variant="warning" icon={<HeartPulse className="h-5 w-5" />} />
        <KpiCard label="Vacaciones" value={data.kpis.vacation} icon={<Palmtree className="h-5 w-5" />} />
        <KpiCard label="Libre" value={data.kpis.dayOff} icon={<CalendarOff className="h-5 w-5" />} />
        <KpiCard label="Baja" value={data.kpis.inactive} icon={<UserX className="h-5 w-5" />} />
        <KpiCard label="Centros pendientes" value={data.kpis.pendingCenters} variant="warning" icon={<AlertTriangle className="h-5 w-5" />} />
        <KpiCard label="Responsables pendientes" value={data.kpis.pendingResponsibles} variant="danger" icon={<UserCog className="h-5 w-5" />} />
      </div>

      {/* Pending responsibles alert */}
      {data.pendingResponsibles.length > 0 ? (
        <Card
          title="Responsables que debían cerrar parte y no lo hicieron"
          description="Centros sin informe en jornada laborable del responsable"
          className="border-red-200 bg-red-50/40"
        >
          <div className="space-y-3">
            {data.pendingResponsibles.map((r) => (
              <div
                key={r.responsibleId}
                className="rounded-xl border border-red-200 bg-white px-4 py-3 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">
                      {r.fullName}
                      {r.username && (
                        <span className="ml-2 text-sm font-normal text-slate-500">@{r.username}</span>
                      )}
                    </p>
                    <div className="mt-2 space-y-2">
                      {r.pendingCenters.map((c) => (
                        <div key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
                          <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                            <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            {c.name}
                          </span>
                          {c.schedule && (
                            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                              <Clock className="h-3 w-3" />
                              {c.schedule.startTime} – {c.schedule.endTime}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <Badge variant="danger" className="shrink-0">Parte pendiente</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : data.centers.length > 0 && data.pendingCenters.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <span className="font-medium text-emerald-800">
            {selectedCenterName
              ? `${selectedCenterName} ha enviado el parte`
              : "Todos los centros han enviado parte"}
          </span>
        </div>
      ) : null}

      {/* Pending centers alert */}
      {data.pendingCenters.length > 0 && (
        <Card title="Centros pendientes" description="Aún no han enviado el parte del día">
          <div className="space-y-2">
            {data.pendingCenters.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
              >
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
                <span className="font-medium text-slate-900">{c.name}</span>
                <Badge variant="warning" className="ml-auto">Pendiente</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* By center status */}
      <Card title="Estado por centro" description="Parte enviado o pendiente">
        {/* Desktop table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-slate-500">
                <th className="pb-2 pr-4">Centro</th>
                <th className="pb-2 pr-4">Estado</th>
                <th className="pb-2 pr-4">Enviado por</th>
                <th className="pb-2">Hora de envío</th>
              </tr>
            </thead>
            <tbody>
              {data.centers.map((c) => (
                <tr key={c.center.id} className="border-b border-slate-50">
                  <td className="py-3 pr-4 font-medium">{c.center.name}</td>
                  <td className="py-3 pr-4">
                    <Badge variant={c.submitted ? "success" : "warning"}>
                      {c.submitted ? "Parte enviado" : "Pendiente"}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4 text-slate-600">{c.submitterName || "—"}</td>
                  <td className="py-3 text-slate-500">
                    {c.submittedAt ? formatDateTime(c.submittedAt) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Mobile cards */}
        <div className="space-y-3 md:hidden">
          {data.centers.map((c) => (
            <div key={c.center.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  <span className="font-medium text-slate-900">{c.center.name}</span>
                </div>
                <Badge variant={c.submitted ? "success" : "warning"}>
                  {c.submitted ? "Enviado" : "Pendiente"}
                </Badge>
              </div>
              {c.submitted && (
                <div className="mt-2 space-y-1 text-xs text-slate-500">
                  <p>Enviado por: {c.submitterName}</p>
                  <p className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDateTime(c.submittedAt!)}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Submissions by responsibles */}
      {data.submissions.length > 0 && (
        <Card title="Responsables que cerraron partes" description="Informes enviados">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-500">
                  <th className="pb-2 pr-4">Responsable</th>
                  <th className="pb-2 pr-4">Centro</th>
                  <th className="pb-2">Hora</th>
                </tr>
              </thead>
              <tbody>
                {data.submissions.map((s, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td className="py-3 pr-4 font-medium">{s.submitterName}</td>
                    <td className="py-3 pr-4">{s.centerName}</td>
                    <td className="py-3 text-slate-500">{formatDateTime(s.submittedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-2 md:hidden">
            {data.submissions.map((s, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5">
                <div>
                  <p className="font-medium text-slate-900">{s.submitterName}</p>
                  <p className="text-xs text-slate-500">{s.centerName}</p>
                </div>
                <span className="text-xs text-slate-500">{formatTime(s.submittedAt)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Attended */}
      <Card title="Personas que asistieron" description={`${data.attended.length} empleados`}>
        {data.attended.length === 0 ? (
          <p className="text-sm text-slate-500">Nadie ha registrado asistencia para este día.</p>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-slate-500">
                    <th className="pb-2 pr-4">Nombre</th>
                    <th className="pb-2 pr-4">Centro</th>
                    <th className="pb-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.attended.map((e) => (
                    <tr key={e.employeeId} className="border-b border-slate-50">
                      <td className="py-3 pr-4 font-medium">{e.employeeName}</td>
                      <td className="py-3 pr-4 text-slate-600">{e.centerName}</td>
                      <td className="py-3"><StatusBadge status={e.status} showLabel /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-2 md:hidden">
              {data.attended.map((e) => (
                <div key={e.employeeId} className="flex items-center justify-between rounded-lg border border-green-100 bg-green-50/50 px-3 py-2.5">
                  <div>
                    <p className="font-medium text-slate-900">{e.employeeName}</p>
                    <p className="text-xs text-slate-500">{e.centerName}</p>
                  </div>
                  <StatusBadge status={e.status} />
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* Not attended */}
      <Card title="Personas que no asistieron" description={`${data.notAttended.length} registros`}>
        {data.notAttended.length === 0 ? (
          <p className="text-sm text-slate-500">Sin ausencias registradas.</p>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-slate-500">
                    <th className="pb-2 pr-4">Nombre</th>
                    <th className="pb-2 pr-4">Centro</th>
                    <th className="pb-2 pr-4">Estado</th>
                    <th className="pb-2">Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {data.notAttended.map((e) => (
                    <tr key={`${e.employeeId}-${e.status}`} className="border-b border-slate-50">
                      <td className="py-3 pr-4 font-medium">{e.employeeName}</td>
                      <td className="py-3 pr-4 text-slate-600">{e.centerName}</td>
                      <td className="py-3 pr-4"><StatusBadge status={e.status} showLabel /></td>
                      <td className="py-3 text-slate-500">{e.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-2 md:hidden">
              {data.notAttended.map((e) => (
                <div key={`${e.employeeId}-${e.status}`} className="rounded-lg border border-slate-100 px-3 py-2.5">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-900">{e.employeeName}</p>
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

      {data.centers.length === 0 && (
        <Card>
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <FileCheck className="h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-500">No hay centros activos configurados.</p>
          </div>
        </Card>
      )}
    </div>
  );
}
