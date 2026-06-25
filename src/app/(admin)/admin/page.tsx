import { getDashboardSummary, getTodayReports } from "@/lib/actions/attendance";
import { getCenters } from "@/lib/actions/centers";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default async function AdminDashboard() {
  const [summary, todayReports, centers] = await Promise.all([
    getDashboardSummary(),
    getTodayReports(),
    getCenters(),
  ]);

  const activeCenters = centers.filter((c) => c.active);
  const reportedIds = new Set(todayReports.map((r) => r.center_id));
  const pendingCenters = activeCenters.filter((c) => !reportedIds.has(c.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Panel de administración</h1>
          <p className="text-sm text-gray-500">Resumen del día de hoy</p>
        </div>
        <Link href="/admin/monthly">
          <Button variant="outline">Ver cuadrícula mensual</Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="!p-4">
          <p className="text-sm text-gray-500">Centros activos</p>
          <p className="text-3xl font-bold text-gray-900">{summary.activeCenters}</p>
        </Card>
        <Card className="!p-4">
          <p className="text-sm text-gray-500">Empleados activos</p>
          <p className="text-3xl font-bold text-gray-900">{summary.activeEmployees}</p>
        </Card>
        <Card className="!p-4">
          <p className="text-sm text-gray-500">Informes enviados hoy</p>
          <p className="text-3xl font-bold text-green-600">{summary.todayReports}</p>
        </Card>
        <Card className="!p-4">
          <p className="text-sm text-gray-500">Centros pendientes</p>
          <p className="text-3xl font-bold text-orange-600">{summary.pendingCenters}</p>
        </Card>
      </div>

      {pendingCenters.length > 0 && (
        <Card title="Centros pendientes de informe" description="Aún no han enviado el control de hoy">
          <div className="space-y-2">
            {pendingCenters.map((center) => (
              <div key={center.id} className="flex items-center justify-between rounded-lg bg-orange-50 px-4 py-3">
                <span className="font-medium text-gray-900">{center.name}</span>
                <Badge variant="warning">Pendiente</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card title="Informes enviados hoy" description="Control de asistencia recibido">
        {todayReports.length === 0 ? (
          <p className="text-sm text-gray-500">No hay informes enviados hoy todavía.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 pr-4">Centro</th>
                  <th className="pb-2 pr-4">Enviado por</th>
                  <th className="pb-2">Hora</th>
                </tr>
              </thead>
              <tbody>
                {todayReports.map((report) => (
                  <tr key={report.id} className="border-b border-gray-50">
                    <td className="py-3 pr-4 font-medium">{report.center?.name}</td>
                    <td className="py-3 pr-4">{report.submitter?.full_name}</td>
                    <td className="py-3 text-gray-500">{formatDateTime(report.submitted_at)}</td>
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
