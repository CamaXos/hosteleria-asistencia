import { notFound } from "next/navigation";
import {
  checkTodayReport,
  getActiveEmployeesForCenter,
  getAssignedCenters,
} from "@/lib/actions/attendance";
import { DailyReportForm } from "@/components/responsible/DailyReportForm";

interface ReportPageProps {
  params: Promise<{ centerId: string }>;
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { centerId } = await params;
  const assignedCenters = await getAssignedCenters();
  const center = assignedCenters.find((c) => c.id === centerId);

  if (!center) notFound();

  const [existingReport, employees] = await Promise.all([
    checkTodayReport(centerId),
    getActiveEmployeesForCenter(centerId),
  ]);

  return (
    <DailyReportForm
      center={center}
      initialEmployees={employees}
      alreadySubmitted={!!existingReport}
    />
  );
}
