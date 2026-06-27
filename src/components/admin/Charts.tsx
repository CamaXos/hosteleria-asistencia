"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import type { StatusCount, CenterSubmissionRate, MonthlyTrendPoint, DailySubmission } from "@/lib/actions/analytics";
import { formatDate } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  worked: "#059669",
  day_off: "#3b82f6",
  vacation: "#8b5cf6",
  absence: "#dc2626",
  sick: "#d97706",
  other: "#eab308",
};

export function AttendanceStatusChart({ data }: { data: StatusCount[] }) {
  const chartData = data.filter((d) => d.count > 0);

  if (chartData.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">Sin datos esta semana</p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="count"
          nameKey="label"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
        >
          {chartData.map((entry) => (
            <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || "#94a3b8"} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => [value, "Registros"]} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function CenterSubmissionChart({ data }: { data: CenterSubmissionRate[] }) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">Sin centros activos</p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
        <YAxis
          type="category"
          dataKey="centerName"
          width={100}
          tick={{ fontSize: 11 }}
        />
        <Tooltip formatter={(value) => [`${value}%`, "Tasa envío"]} />
        <Bar dataKey="rate" fill="#1e3a5f" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MonthlyTrendChart({ data }: { data: MonthlyTrendPoint[] }) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">Sin datos para este período</p>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    label: formatDate(d.date, "dd/MM"),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend />
        <Bar dataKey="worked" name="Trabajado" stackId="a" fill={STATUS_COLORS.worked} />
        <Bar dataKey="day_off" name="Libre" stackId="a" fill={STATUS_COLORS.day_off} />
        <Bar dataKey="vacation" name="Vacaciones" stackId="a" fill={STATUS_COLORS.vacation} />
        <Bar dataKey="absence" name="Falta" stackId="a" fill={STATUS_COLORS.absence} />
        <Bar dataKey="sick" name="Enfermedad" stackId="a" fill={STATUS_COLORS.sick} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DailySubmissionChart({ data }: { data: DailySubmission[] }) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">Sin datos de envíos</p>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    label: formatDate(d.date, "EEE dd"),
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip />
        <Legend />
        <Bar dataKey="submitted" name="Enviados" fill="#059669" radius={[4, 4, 0, 0]} />
        <Bar dataKey="pending" name="Pendientes" fill="#f59e0b" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
