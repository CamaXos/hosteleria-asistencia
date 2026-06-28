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

const MADRID_TZ = "Europe/Madrid";

export function getTodayISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: MADRID_TZ }).format(new Date());
}

const ISO_WEEKDAY_MAP: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

/** Día ISO (1=Lunes … 7=Domingo) para una fecha calendario en Europe/Madrid */
export function getIsoWeekdayMadrid(dateISO: string): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: MADRID_TZ,
    weekday: "short",
  }).format(new Date(`${dateISO}T12:00:00.000Z`));
  return ISO_WEEKDAY_MAP[weekday] ?? 1;
}

export function parseDateParam(value: string | undefined): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return getTodayISO();
  const d = parseISO(value);
  if (Number.isNaN(d.getTime())) return getTodayISO();
  return value;
}

export function formatTime(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "HH:mm", { locale: es });
}

export function formatTimeMadrid(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: MADRID_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
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

export function mapAttendanceSubmitError(message: string): string {
  if (message.includes("Could not find the function")) {
    return "Error de configuración del servidor al enviar el informe. Contacta con el administrador.";
  }
  if (message.includes("Ya existe un informe")) {
    return "Ya existe un informe de asistencia para este centro hoy.";
  }
  if (message.includes("No autenticado")) {
    return "Tu sesión ha expirado. Vuelve a iniciar sesión.";
  }
  if (message.includes("Solo los responsables")) {
    return "Solo los responsables pueden enviar informes de asistencia.";
  }
  if (message.includes("No tienes acceso")) {
    return "No tienes acceso a este centro.";
  }
  if (message.includes("Empleado no pertenece")) {
    return "Uno de los empleados seleccionados no pertenece a este centro.";
  }
  return message;
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
