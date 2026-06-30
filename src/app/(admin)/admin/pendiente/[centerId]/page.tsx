import { notFound } from "next/navigation";
import {
  adminSubmitAttendanceReport,
  checkReportForDate,
  getActiveEmployeesForCenter,
} from "@/lib/actions/attendance";
import { getCenters } from "@/lib/actions/centers";
import { DailyReportForm } from "@/components/responsible/DailyReportForm";
import { parseDateParam } from "@/lib/utils";

interface PageProps {
  params: Promise<{ centerId: string }>;
  searchParams: Promise<{ date?: string }>;
}

export default async function AdminPendienteReportPage({ params, searchParams }: PageProps) {
  const { centerId } = await params;
  const { date: dateParam } = await searchParams;
  const reportDate = parseDateParam(dateParam);

  const centers = await getCenters();
  const center = centers.find((c) => c.id === centerId && c.active);

  if (!center) notFound();

  const [existingReport, employees] = await Promise.all([
    checkReportForDate(centerId, reportDate),
    getActiveEmployeesForCenter(centerId),
  ]);

  return (
    <DailyReportForm
      center={center}
      initialEmployees={employees}
      alreadySubmitted={!!existingReport}
      reportDate={reportDate}
      backHref={`/admin/resumen-diario?view=pendiente&date=${reportDate}`}
      successHref={`/admin/resumen-diario?view=pendiente&date=${reportDate}`}
      showEmployeeManagement={false}
      submitReport={async (centerId, entries, notes, date) =>
        adminSubmitAttendanceReport(centerId, date || reportDate, entries, notes)
      }
      submittedMessage="El parte ha sido registrado correctamente por administración."
    />
  );
}
