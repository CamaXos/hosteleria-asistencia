"use client";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate, formatDateTime } from "@/lib/utils";
import { DAY_OF_WEEK_LABELS } from "@/lib/constants";
import type { ResponsibleStatsData } from "@/lib/actions/responsible-stats";
import { Clock, CalendarDays, Building2, Send } from "lucide-react";

interface ResponsibleStatsViewProps {
  data: ResponsibleStatsData;
}

export function ResponsibleStatsView({ data }: ResponsibleStatsViewProps) {
  const schedulesByCenter = data.schedules.reduce<
    Record<string, typeof data.schedules>
  >((acc, s) => {
    if (!acc[s.centerId]) acc[s.centerId] = [];
    acc[s.centerId].push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-6 pb-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Estadísticas</h1>
        <p className="text-sm text-slate-500">Tus envíos y horarios asignados</p>
      </div>

      {/* Schedule */}
      <Card title="Mi horario" description="Horarios asignados por centro">
        {data.assignedCenters.length === 0 ? (
          <p className="text-sm text-slate-500">No tienes centros asignados.</p>
        ) : (
          <div className="space-y-4">
            {data.assignedCenters.map((center) => {
              const centerSchedules = schedulesByCenter[center.id] || [];
              return (
                <div key={center.id} className="rounded-xl border border-slate-100 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-[var(--primary)]" />
                    <span className="font-medium text-slate-900">{center.name}</span>
                  </div>
                  {centerSchedules.length === 0 ? (
                    <p className="text-xs text-slate-400">Sin horario asignado</p>
                  ) : (
                    <div className="space-y-2">
                      {centerSchedules
                        .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                        .map((s) => (
                          <div
                            key={`${s.centerId}-${s.dayOfWeek}`}
                            className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm"
                          >
                            <Clock className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                            <span className="font-medium text-slate-900">
                              {DAY_OF_WEEK_LABELS[s.dayOfWeek]} {s.startTime} – {s.endTime}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Recent submissions */}
      <Card title="Envíos recientes" description="Últimos 30 días">
        {data.submissions.length === 0 ? (
          <p className="text-sm text-slate-500">No has enviado informes en los últimos 30 días.</p>
        ) : (
          <div className="space-y-3">
            {data.submissions.map((s) => (
              <div
                key={s.id}
                className="rounded-xl border border-slate-100 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900">{s.centerName}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatDate(s.reportDate)}
                    </p>
                  </div>
                  <Badge variant="success">
                    <Send className="mr-1 h-3 w-3" />
                    Enviado
                  </Badge>
                </div>
                <p className="mt-2 flex items-center gap-1 text-sm text-slate-600">
                  <Clock className="h-4 w-4 text-slate-400" />
                  Hora de envío: <strong>{formatDateTime(s.submittedAt).split(" ")[1]}</strong>
                  <span className="text-slate-400">({formatDateTime(s.submittedAt)})</span>
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {s.entryCount} empleado{s.entryCount !== 1 ? "s" : ""} registrado{s.entryCount !== 1 ? "s" : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
