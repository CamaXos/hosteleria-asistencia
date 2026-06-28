import { getCenters } from "@/lib/actions/centers";
import { getEmployees } from "@/lib/actions/employees";
import { getMonthlyTrends, getEmployeesAtRisk, getCenterSubmissionRates } from "@/lib/actions/analytics";
import { AnalyticsPageClient } from "@/components/admin/AnalyticsPageClient";

export default async function AnalyticsPage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [centers, employees, trends, atRisk, centerRates] = await Promise.all([
    getCenters(),
    getEmployees(),
    getMonthlyTrends(year, month),
    getEmployeesAtRisk(2),
    getCenterSubmissionRates(),
  ]);

  const activeCenters = centers.filter((c) => c.active);

  return (
    <AnalyticsPageClient
      initialYear={year}
      initialMonth={month}
      centers={activeCenters}
      employees={employees}
      initialTrends={trends}
      atRisk={atRisk}
      centerRates={centerRates}
    />
  );
}
