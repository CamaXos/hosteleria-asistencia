import type { AttendanceStatus } from "@/lib/types/database";
import type { EmployeeHistoryEntry } from "@/lib/actions/responsible-stats";

export type MonthDayStatus = AttendanceStatus | "none";

export interface MonthCalendarDay {
  day: number;
  date: string;
  status: MonthDayStatus;
  weekday: number;
}

/** Lunes = 0 … Domingo = 6 */
export function getMondayBasedWeekday(year: number, month: number, day: number): number {
  const jsDay = new Date(year, month - 1, day).getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

export function buildMonthCalendarDays(
  year: number,
  month: number,
  entries: EmployeeHistoryEntry[]
): MonthCalendarDay[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const entryMap = new Map<string, AttendanceStatus>();

  for (const entry of entries) {
    entryMap.set(entry.date.slice(0, 10), entry.status);
  }

  const days: MonthCalendarDay[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    days.push({
      day,
      date,
      status: entryMap.get(date) ?? "none",
      weekday: getMondayBasedWeekday(year, month, day),
    });
  }

  return days;
}
