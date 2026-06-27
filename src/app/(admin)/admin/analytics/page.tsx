import { getCenters } from "@/lib/actions/centers";
import { getMonthlyTrends, getEmployeesAtRisk, getCenterSubmissionRates } from "@/lib/actions/analytics";
import { AnalyticsClient } from "@/components/admin/AnalyticsClient";

export default async function AnalyticsPage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [centers, trends, atRisk, centerRates] = await Promise.all([
    getCenters(),
    getMonthlyTrends(year, month),
    getEmployeesAtRisk(2),
    getCenterSubmissionRates(),
  ]);

  const activeCenters = centers.filter((c) => c.active);

  return (
    <AnalyticsClient
      initialYear={year}
      initialMonth={month}
      centers={activeCenters}
      initialTrends={trends}
      atRisk={atRisk}
      centerRates={centerRates}
    />
  );
}
