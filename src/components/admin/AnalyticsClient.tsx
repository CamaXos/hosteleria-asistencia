"use client";

import { useState, useCallback } from "react";
import { getMonthlyTrends } from "@/lib/actions/analytics";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { MonthlyTrendChart, CenterSubmissionChart } from "@/components/admin/Charts";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { Center } from "@/lib/types/database";
import type { MonthlyTrendPoint, EmployeeAtRisk, CenterSubmissionRate } from "@/lib/actions/analytics";
import { BarChart3, TrendingUp } from "lucide-react";

interface AnalyticsClientProps {
  initialYear: number;
  initialMonth: number;
  centers: Center[];
  initialTrends: MonthlyTrendPoint[];
  atRisk: EmployeeAtRisk[];
  centerRates: CenterSubmissionRate[];
}

export function AnalyticsClient({
  initialYear,
  initialMonth,
  centers,
  initialTrends,
  atRisk,
  centerRates,
}: AnalyticsClientProps) {
  const now = new Date();
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [centerId, setCenterId] = useState("");
  const [trends, setTrends] = useState(initialTrends);
  const [loading, setLoading] = useState(false);

  const loadTrends = useCallback(async (y: number, m: number, cId: string) => {
    setLoading(true);
    try {
      const data = await getMonthlyTrends(y, m, cId || undefined);
      setTrends(data);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleFilterChange(y: number, m: number, cId: string) {
    setYear(y);
    setMonth(m);
    setCenterId(cId);
    loadTrends(y, m, cId);
  }

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: new Date(2000, i).toLocaleString("es", { month: "long" }),
  }));

  const yearOptions = Array.from({ length: 5 }, (_, i) => ({
    value: String(now.getFullYear() - 2 + i),
    label: String(now.getFullYear() - 2 + i),
  }));

  const centerOptions = [
    { value: "", label: "Todos los centros" },
    ...centers.map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-light)] text-[var(--primary)]">
          <BarChart3 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analíticas</h1>
          <p className="text-sm text-slate-500">Tendencias y métricas de asistencia</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Select
          label="Año"
          value={String(year)}
          onChange={(e) => handleFilterChange(Number(e.target.value), month, centerId)}
          options={yearOptions}
        />
        <Select
          label="Mes"
          value={String(month)}
          onChange={(e) => handleFilterChange(year, Number(e.target.value), centerId)}
          options={monthOptions}
        />
        <Select
          label="Centro"
          value={centerId}
          onChange={(e) => handleFilterChange(year, month, e.target.value)}
          options={centerOptions}
        />
      </div>

      <Card
        title="Tendencia mensual"
        description={loading ? "Cargando..." : "Distribución diaria de estados"}
      >
        {loading ? (
          <div className="flex h-[300px] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--primary)]" />
          </div>
        ) : (
          <MonthlyTrendChart data={trends} />
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Tasa de envío por centro" description="Últimos 7 días">
          <CenterSubmissionChart data={centerRates} />
        </Card>

        <Card title="Empleados con incidencias frecuentes" description="2+ faltas o bajas en 30 días">
          {atRisk.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">Sin empleados en riesgo</p>
          ) : (
            <div className="space-y-2">
              {atRisk.map((emp) => (
                <div
                  key={emp.employeeId}
                  className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-slate-900">{emp.employeeName}</p>
                    <p className="text-xs text-slate-500">{emp.centerName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {emp.absenceCount > 0 && <StatusBadge status="absence" />}
                    {emp.sickCount > 0 && <StatusBadge status="sick" />}
                    <span className="text-sm font-bold text-red-600">{emp.total}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card title="Resumen rápido">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-4 text-center">
            <TrendingUp className="mx-auto h-6 w-6 text-[var(--primary)]" />
            <p className="mt-2 text-2xl font-bold text-slate-900">{trends.length}</p>
            <p className="text-xs text-slate-500">Días con datos</p>
          </div>
          <div className="rounded-xl bg-emerald-50 p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">
              {trends.reduce((s, d) => s + d.worked, 0)}
            </p>
            <p className="text-xs text-slate-500">Jornadas trabajadas</p>
          </div>
          <div className="rounded-xl bg-red-50 p-4 text-center">
            <p className="text-2xl font-bold text-red-600">
              {trends.reduce((s, d) => s + d.absence + d.sick, 0)}
            </p>
            <p className="text-xs text-slate-500">Incidencias totales</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
