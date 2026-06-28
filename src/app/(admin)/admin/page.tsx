import { getDashboardSummary, getTodayReports } from "@/lib/actions/attendance";
import { getCenters } from "@/lib/actions/centers";
import {
  getTodayAttendanceStats,
  getWeeklyAttendanceByStatus,
  getCenterSubmissionRates,
  getRecentAbsenceAlerts,
  getEmployeesAtRisk,
  getDailySubmissions,
} from "@/lib/actions/analytics";
import { Card, KpiCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  AttendanceStatusChart,
  CenterSubmissionChart,
  DailySubmissionChart,
} from "@/components/admin/Charts";
import Link from "next/link";
import {
  Building2,
  Users,
  FileCheck,
  AlertTriangle,
  HeartPulse,
  UserX,
  Download,
  BarChart3,
} from "lucide-react";

export default async function AdminDashboard() {
  const [
    summary,
    todayReports,
    centers,
    todayStats,
    weeklyStatus,
    centerRates,
    recentAlerts,
    atRisk,
    dailySubmissions,
  ] = await Promise.all([
    getDashboardSummary(),
    getTodayReports(),
    getCenters(),
    getTodayAttendanceStats(),
    getWeeklyAttendanceByStatus(),
    getCenterSubmissionRates(),
    getRecentAbsenceAlerts(8),
    getEmployeesAtRisk(3),
    getDailySubmissions(7),
  ]);

  const activeCenters = centers.filter((c) => c.active);
  const reportedIds = new Set(todayReports.map((r) => r.center_id));
  const pendingCenters = activeCenters.filter((c) => !reportedIds.has(c.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Panel de administración</h1>
          <p className="text-sm text-slate-500">Resumen del día de hoy</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/analytics">
            <Button variant="outline" size="sm">
              <BarChart3 className="h-4 w-4" />
              Analíticas
            </Button>
          </Link>
          <Link href="/admin/analytics#grid">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4" />
              Exportar mensual
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Centros activos" value={summary.activeCenters} icon={<Building2 className="h-5 w-5" />} />
        <KpiCard label="Empleados activos" value={summary.activeEmployees} icon={<Users className="h-5 w-5" />} />
        <KpiCard label="Informes hoy" value={summary.todayReports} variant="success" icon={<FileCheck className="h-5 w-5" />} />
        <KpiCard label="Pendientes hoy" value={summary.pendingCenters} variant="warning" icon={<AlertTriangle className="h-5 w-5" />} />
        <KpiCard label="Faltas hoy" value={todayStats.absencesToday} variant="danger" icon={<UserX className="h-5 w-5" />} />
        <KpiCard label="Enfermos hoy" value={todayStats.sickToday} variant="warning" icon={<HeartPulse className="h-5 w-5" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Asistencia esta semana" description="Distribución por estado">
          <AttendanceStatusChart data={weeklyStatus} />
        </Card>
        <Card title="Tasa de envío por centro" description="Últimos 7 días">
          <CenterSubmissionChart data={centerRates} />
        </Card>
      </div>

      <Card title="Envíos diarios" description="Informes enviados vs pendientes (7 días)">
        <DailySubmissionChart data={dailySubmissions} />
      </Card>

      {pendingCenters.length > 0 && (
        <Card title="Centros pendientes de informe" description="Aún no han enviado el control de hoy">
          <div className="space-y-2">
            {pendingCenters.map((center) => (
              <div
                key={center.id}
                className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
              >
                <span className="font-medium text-slate-900">{center.name}</span>
                <Badge variant="warning">Pendiente</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Alertas recientes" description="Faltas y bajas por enfermedad (14 días)">
          {recentAlerts.length === 0 ? (
            <p className="text-sm text-slate-500">Sin alertas recientes.</p>
          ) : (
            <div className="space-y-2">
              {recentAlerts.map((alert, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5 text-sm">
                  <div>
                    <p className="font-medium text-slate-900">{alert.employeeName}</p>
                    <p className="text-xs text-slate-500">{alert.centerName} · {alert.reportDate}</p>
                  </div>
                  <StatusBadge status={alert.status} showLabel />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Empleados en riesgo" description="3+ faltas o bajas en 30 días">
          {atRisk.length === 0 ? (
            <p className="text-sm text-slate-500">Ningún empleado supera el umbral.</p>
          ) : (
            <div className="space-y-2">
              {atRisk.map((emp) => (
                <div key={emp.employeeId} className="flex items-center justify-between rounded-lg border border-red-100 bg-red-50/50 px-3 py-2.5 text-sm">
                  <div>
                    <p className="font-medium text-slate-900">{emp.employeeName}</p>
                    <p className="text-xs text-slate-500">{emp.centerName}</p>
                  </div>
                  <div className="text-right text-xs">
                    <p className="font-bold text-red-600">{emp.total} incidencias</p>
                    <p className="text-slate-500">{emp.absenceCount}F · {emp.sickCount}E</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card title="Informes enviados hoy" description="Control de asistencia recibido">
        {todayReports.length === 0 ? (
          <p className="text-sm text-slate-500">No hay informes enviados hoy todavía.</p>
        ) : (
          <div className="overflow-x-auto -mx-5 sm:-mx-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-500">
                  <th className="px-5 pb-2 sm:px-6">Centro</th>
                  <th className="pb-2 pr-4">Enviado por</th>
                  <th className="pb-2">Hora</th>
                </tr>
              </thead>
              <tbody>
                {todayReports.map((report) => (
                  <tr key={report.id} className="border-b border-slate-50">
                    <td className="px-5 py-3 font-medium sm:px-6">{report.center?.name}</td>
                    <td className="py-3 pr-4">{report.submitter?.full_name}</td>
                    <td className="py-3 text-slate-500">{formatDateTime(report.submitted_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
