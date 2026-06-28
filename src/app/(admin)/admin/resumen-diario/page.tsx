import { getDailyOverview, getMonthReportDays } from "@/lib/actions/today";
import { DailySummaryView } from "@/components/admin/DailySummaryView";
import { parseDateParam } from "@/lib/utils";
import { parseISO } from "date-fns";

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function ResumenDiarioPage({ searchParams }: PageProps) {
  const { date: dateParam } = await searchParams;
  const selectedDate = parseDateParam(dateParam);
  const selected = parseISO(selectedDate);
  const year = selected.getFullYear();
  const month = selected.getMonth() + 1;

  const [data, reportDays] = await Promise.all([
    getDailyOverview(selectedDate),
    getMonthReportDays(year, month),
  ]);

  return (
    <DailySummaryView
      data={data}
      selectedDate={selectedDate}
      reportDays={reportDays}
    />
  );
}
