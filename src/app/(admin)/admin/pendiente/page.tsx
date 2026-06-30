import { getDailyOverview, getMonthReportDays } from "@/lib/actions/today";
import { PendienteView } from "@/components/admin/PendienteView";
import { parseDateParam } from "@/lib/utils";
import { parseISO } from "date-fns";

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function PendientePage({ searchParams }: PageProps) {
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
    <PendienteView
      data={data}
      selectedDate={selectedDate}
      reportDays={reportDays}
    />
  );
}
