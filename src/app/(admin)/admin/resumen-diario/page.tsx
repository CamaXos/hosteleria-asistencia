import { getDailyOverview } from "@/lib/actions/today";
import { DailySummaryView } from "@/components/admin/DailySummaryView";
import { parseDateParam } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function ResumenDiarioPage({ searchParams }: PageProps) {
  const { date: dateParam } = await searchParams;
  const selectedDate = parseDateParam(dateParam);
  const data = await getDailyOverview(selectedDate);
  return <DailySummaryView data={data} selectedDate={selectedDate} />;
}
