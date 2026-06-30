import type { ResponsibleSubmissionEntry } from "@/lib/actions/responsible-stats";
import { getIsoWeekdayMadrid } from "@/lib/utils";

export type SubmissionDayStatus =
  | "submitted"
  | "partial"
  | "pending"
  | "future";

export interface SubmissionCalendarDay {
  day: number;
  date: string;
  status: SubmissionDayStatus;
  submittedTime: string | null;
  weekday: number;
}

function getIsoWeekday(year: number, month: number, day: number): number {
  const dateISO = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return getIsoWeekdayMadrid(dateISO);
}

/** Lunes = 0 … Domingo = 6 */
export function getMondayBasedWeekday(year: number, month: number, day: number): number {
  const iso = getIsoWeekday(year, month, day);
  return iso - 1;
}

export function buildSubmissionCalendarDays(
  year: number,
  month: number,
  entries: ResponsibleSubmissionEntry[],
  today: string
): SubmissionCalendarDay[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const byDate = new Map<string, ResponsibleSubmissionEntry[]>();

  for (const entry of entries) {
    const list = byDate.get(entry.date) ?? [];
    list.push(entry);
    byDate.set(entry.date, list);
  }

  const days: SubmissionCalendarDay[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayEntries = byDate.get(date) ?? [];
    const relevant = dayEntries.filter((e) => e.status !== "future");

    let status: SubmissionDayStatus;
    let submittedTime: string | null = null;

    if (date > today) {
      status = "future";
    } else if (relevant.length === 0) {
      status = "pending";
    } else {
      const submitted = relevant.filter((e) => e.status === "submitted");
      const pending = relevant.filter((e) => e.status === "pending");

      if (submitted.length === relevant.length) {
        status = "submitted";
        submittedTime = submitted[submitted.length - 1]?.submittedTime ?? null;
      } else if (submitted.length > 0) {
        status = "partial";
        submittedTime = submitted[submitted.length - 1]?.submittedTime ?? null;
      } else {
        status = "pending";
      }

      if (pending.length === 0 && submitted.length === 0) {
        status = "pending";
      }
    }

    days.push({
      day,
      date,
      status,
      submittedTime,
      weekday: getMondayBasedWeekday(year, month, day),
    });
  }

  return days;
}
