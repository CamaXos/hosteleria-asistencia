import { getResponsibleStats } from "@/lib/actions/responsible-stats";
import { ResponsibleStatsView } from "@/components/responsible/ResponsibleStatsView";

export default async function ResponsibleStatsPage() {
  const data = await getResponsibleStats();
  return <ResponsibleStatsView data={data} />;
}
