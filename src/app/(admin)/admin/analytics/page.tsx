import { getCenters } from "@/lib/actions/centers";
import { getEmployees } from "@/lib/actions/employees";
import { getMonthlyTrends, getEmployeesAtRisk, getCenterSubmissionRates } from "@/lib/actions/analytics";
import { AnalyticsClient } from "@/components/admin/AnalyticsClient";
import { MonthlyGrid } from "@/components/admin/MonthlyGrid";

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
    <div className="space-y-8">
      <MonthlyGrid
        centers={activeCenters}
        employees={employees}
        title="Cuadrícula mensual de asistencia"
        sectionId="grid"
      />
      <AnalyticsClient
        initialYear={year}
        initialMonth={month}
        centers={activeCenters}
        initialTrends={trends}
        atRisk={atRisk}
        centerRates={centerRates}
      />
    </div>
  );
}
