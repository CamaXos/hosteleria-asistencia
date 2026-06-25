import type { MonthlyAttendanceRow } from "@/lib/types/database";
import { ATTENDANCE_STATUS_CODES } from "@/lib/constants";
import { getMonthDays } from "@/lib/utils/index";

export function generateMonthlyCSV(
  rows: MonthlyAttendanceRow[],
  year: number,
  month: number,
  centerName: string
): string {
  const daysInMonth = getMonthDays(year, month);
  const headers = [
    "Empleado",
    "DNI/NIE",
    "Puesto",
    ...Array.from({ length: daysInMonth }, (_, i) => String(i + 1)),
    "T",
    "L",
    "V",
    "F",
    "E",
    "B",
    "O",
  ];

  const csvRows = rows.map((row) => {
    const dayValues = Array.from({ length: daysInMonth }, (_, i) => {
      const status = row.days[i + 1];
      return status ? ATTENDANCE_STATUS_CODES[status] : "";
    });

    return [
      row.employee.full_name,
      row.employee.dni_nie || "",
      row.employee.position || "",
      ...dayValues,
      String(row.totals.worked),
      String(row.totals.day_off),
      String(row.totals.vacation),
      String(row.totals.absence),
      String(row.totals.sick),
      String(row.totals.inactive),
      String(row.totals.other),
    ];
  });

  const escape = (val: string) => `"${val.replace(/"/g, '""')}"`;

  return [
    `"Centro: ${centerName}"`,
    `"Mes: ${month}/${year}"`,
    "",
    headers.map(escape).join(","),
    ...csvRows.map((row) => row.map(escape).join(",")),
  ].join("\n");
}
