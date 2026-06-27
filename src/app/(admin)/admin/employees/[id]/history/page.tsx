import { notFound } from "next/navigation";
import {
  getEmployeeHistory,
  getEmployeeById,
} from "@/lib/actions/responsible-stats";
import { EmployeeHistoryView } from "@/components/admin/EmployeeHistoryView";

interface PageProps {
  params: Promise<{ id: string }>;
}

const EMPTY_SUMMARY = {
  worked: 0,
  day_off: 0,
  vacation: 0,
  absence: 0,
  sick: 0,
  inactive: 0,
  other: 0,
} as const;

export default async function EmployeeHistoryPage({ params }: PageProps) {
  const { id } = await params;
  const employee = await getEmployeeById(id);
  if (!employee) notFound();

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  let entries: Awaited<ReturnType<typeof getEmployeeHistory>>["entries"] = [];
  let summary = { ...EMPTY_SUMMARY };

  try {
    const result = await getEmployeeHistory(id, year, month);
    entries = result.entries;
    summary = result.summary;
  } catch {
    // Historial vacío si la consulta falla; la vista sigue mostrando datos del empleado.
  }

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
    />
  );
}
