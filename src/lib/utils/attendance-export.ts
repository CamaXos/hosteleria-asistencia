import type { AttendanceStatus, MonthlyAttendanceRow } from "@/lib/types/database";
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

export function downloadCSV(content: string, filename: string) {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function generateMonthlyExcel(
  rows: MonthlyAttendanceRow[],
  year: number,
  month: number,
  centerName: string
): Promise<ArrayBuffer> {
  const XLSX = await import("xlsx");
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

  const data = rows.map((row) => {
    const dayValues = Array.from({ length: daysInMonth }, (_, i) => {
      const status = row.days[i + 1];
      return status ? ATTENDANCE_STATUS_CODES[status] : "";
    });

    return [
      row.employee.full_name,
      row.employee.dni_nie || "",
      row.employee.position || "",
      ...dayValues,
      row.totals.worked,
      row.totals.day_off,
      row.totals.vacation,
      row.totals.absence,
      row.totals.sick,
      row.totals.inactive,
      row.totals.other,
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([
    [`Centro: ${centerName}`],
    [`Mes: ${month}/${year}`],
    [],
    headers,
    ...data,
  ]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Asistencia");
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

export function downloadExcel(buffer: ArrayBuffer, filename: string) {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
