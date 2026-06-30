import { getDailyOverview, getMonthReportDays } from "@/lib/actions/today";
import { DailySummaryView } from "@/components/admin/DailySummaryView";
import { PendienteView } from "@/components/admin/PendienteView";
import { parseDateParam } from "@/lib/utils";
import { parseISO } from "date-fns";

interface PageProps {
  searchParams: Promise<{ date?: string; center?: string; view?: string }>;
}

export default async function ResumenDiarioPage({ searchParams }: PageProps) {
  const { date: dateParam, center: centerParam, view: viewParam } = await searchParams;
  const selectedDate = parseDateParam(dateParam);
  const selectedCenter = centerParam || null;
  const showPendiente = viewParam === "pendiente";
  const selected = parseISO(selectedDate);
  const year = selected.getFullYear();
  const month = selected.getMonth() + 1;

  const [data, reportDays] = await Promise.all([
    getDailyOverview(selectedDate, showPendiente ? null : selectedCenter),
    getMonthReportDays(year, month),
  ]);

  if (showPendiente) {
    return (
      <PendienteView
        data={data}
        selectedDate={selectedDate}
        reportDays={reportDays}
      />
    );
  }

  return (
    <DailySummaryView
      data={data}
      selectedDate={selectedDate}
      selectedCenter={selectedCenter}
      reportDays={reportDays}
    />
  );
}
