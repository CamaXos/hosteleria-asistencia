import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export function formatDate(date: string | Date, pattern = "dd/MM/yyyy"): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, pattern, { locale: es });
}

export function formatDateLong(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "EEEE d 'de' MMMM yyyy", { locale: es });
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "dd/MM/yyyy HH:mm", { locale: es });
}

export function getTodayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function getMonthDays(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Ha ocurrido un error inesperado";
}

export function emptyTotals(): Record<import("@/lib/types/database").AttendanceStatus, number> {
  return {
    worked: 0,
    day_off: 0,
    vacation: 0,
    absence: 0,
    sick: 0,
    inactive: 0,
    other: 0,
  };
}
