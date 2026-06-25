import { getEmployees } from "@/lib/actions/employees";
import { getCenters } from "@/lib/actions/centers";
import { EmployeesManager } from "@/components/admin/EmployeesManager";

export default async function EmployeesPage() {
  const [employees, centers] = await Promise.all([getEmployees(), getCenters()]);
  return <EmployeesManager employees={employees} centers={centers} />;
}
