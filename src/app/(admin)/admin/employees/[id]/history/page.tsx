import { notFound } from "next/navigation";
import {
  getEmployeeHistory,
  getEmployeeById,
} from "@/lib/actions/responsible-stats";
import { EmployeeHistoryView } from "@/components/admin/EmployeeHistoryView";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function fetchEmployeeHistory(employeeId: string, year: number, month: number) {
  "use server";
  const { entries, summary } = await getEmployeeHistory(employeeId, year, month);
  return { entries, summary };
}

export default async function EmployeeHistoryPage({ params }: PageProps) {
  const { id } = await params;
  const employee = await getEmployeeById(id);
  if (!employee) notFound();

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const { entries, summary } = await getEmployeeHistory(id, year, month);

  const center = employee.centers as { name: string } | null;
  const centerName = center?.name || "—";

  return (
    <EmployeeHistoryView
      employeeId={id}
      employeeName={employee.full_name}
      centerName={centerName}
      initialEntries={entries}
      initialSummary={summary}
      initialYear={year}
      initialMonth={month}
      onMonthChange={(y, m) => fetchEmployeeHistory(id, y, m)}
    />
  );
}
