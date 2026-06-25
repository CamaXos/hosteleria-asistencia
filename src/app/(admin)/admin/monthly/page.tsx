import { getCenters } from "@/lib/actions/centers";
import { getEmployees } from "@/lib/actions/employees";
import { MonthlyGrid } from "@/components/admin/MonthlyGrid";

export default async function MonthlyPage() {
  const [centers, employees] = await Promise.all([getCenters(), getEmployees()]);

  return <MonthlyGrid centers={centers} employees={employees} />;
}
