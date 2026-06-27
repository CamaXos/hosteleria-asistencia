import { getTodayOverview } from "@/lib/actions/today";
import { TodayView } from "@/components/admin/TodayView";

export default async function AdminHoyPage() {
  const data = await getTodayOverview();
  return <TodayView data={data} />;
}
