import { notFound } from "next/navigation";
import {
  adminSubmitPendienteReport,
  checkReportForDate,
  getActiveEmployeesForCenter,
} from "@/lib/actions/attendance";
import { DailyReportForm } from "@/components/responsible/DailyReportForm";
import { mapSupabaseQueryError, parseDateParam } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

interface PageProps {
  params: Promise<{ centerId: string }>;
  searchParams: Promise<{ date?: string }>;
}

export default async function AdminPendienteReportPage({ params, searchParams }: PageProps) {
  const { centerId } = await params;
  const { date: dateParam } = await searchParams;
  const reportDate = parseDateParam(dateParam);

  const supabase = await createClient();
  const { data: center, error: centerError } = await supabase
    .from("centers")
    .select("*")
    .eq("id", centerId)
    .eq("active", true)
    .maybeSingle();

  if (centerError) {
    console.error("[pendiente] center:", centerError.message, centerError.code);
    throw new Error(mapSupabaseQueryError(centerError.message, centerError.code));
  }

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
      submitReport={adminSubmitPendienteReport}
      submittedMessage="El parte ha sido registrado correctamente por administración."
    />
  );
}
