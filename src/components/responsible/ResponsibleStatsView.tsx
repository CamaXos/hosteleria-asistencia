"use client";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { ResponsibleStatsData } from "@/lib/actions/responsible-stats";
import { CalendarDays, Send } from "lucide-react";

interface ResponsibleStatsViewProps {
  data: ResponsibleStatsData;
}

export function ResponsibleStatsView({ data }: ResponsibleStatsViewProps) {
  return (
    <div className="space-y-6 pb-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Estadísticas</h1>
        <p className="text-sm text-slate-500">Tus envíos de los últimos 2 días</p>
      </div>

      <Card title="Envíos recientes" description="Últimos 2 días">
        {data.submissions.length === 0 ? (
          <p className="text-sm text-slate-500">No has enviado informes en los últimos 2 días.</p>
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
                <p className="mt-2 text-sm text-slate-600">
                  Hora de envío: <strong>{formatDateTime(s.submittedAt)}</strong>
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
