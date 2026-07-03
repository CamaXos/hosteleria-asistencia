/**
 * Día laboral de asistencia (Europe/Madrid).
 *
 * Un día laboral va de las 05:00 a las 05:00 del día calendario siguiente.
 * Ejemplo: a las 03:00 del 3 de julio, la fecha laboral es el 2 de julio.
 *
 * La columna `report_date` almacena la fecha laboral (YYYY-MM-DD).
 * `submitted_at` conserva la hora real de envío.
 */

const MADRID_TZ = "Europe/Madrid";
const BUSINESS_DAY_CUTOFF_HOUR = 5;

interface MadridParts {
  year: string;
  month: string;
  day: string;
  hour: number;
}

function getMadridParts(date: Date): MadridParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: MADRID_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "0";
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: parseInt(get("hour"), 10),
  };
}

function toISO(year: string, month: string, day: string): string {
  return `${year}-${month}-${day}`;
}

/** Resta días a una fecha ISO (YYYY-MM-DD) sin depender de la zona horaria local. */
export function subtractDaysFromISO(dateISO: string, days: number): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - days);
  return dt.toISOString().slice(0, 10);
}

/**
 * Fecha laboral actual en Europe/Madrid (YYYY-MM-DD).
 * Si la hora local en Madrid es >= 05:00 → fecha calendario.
 * Si es < 05:00 → día anterior.
 */
export function getBusinessDate(now: Date = new Date()): string {
  const { year, month, day, hour } = getMadridParts(now);
  const calendarDate = toISO(year, month, day);
  if (hour >= BUSINESS_DAY_CUTOFF_HOUR) {
    return calendarDate;
  }
  return subtractDaysFromISO(calendarDate, 1);
}

/** Etiqueta corta dd/MM/yyyy para la fecha laboral. */
export function getBusinessDateLabel(businessDateISO: string): string {
  const [y, m, d] = businessDateISO.split("-");
  return `${d}/${m}/${y}`;
}

/** Comprueba si un instante pertenece a la fecha laboral indicada. */
export function isWithinBusinessDay(
  instant: Date,
  businessDateISO: string
): boolean {
  return getBusinessDate(instant) === businessDateISO;
}

export function isBeforeBusinessDay(
  dateISO: string,
  reference: Date = new Date()
): boolean {
  return dateISO < getBusinessDate(reference);
}

export function isAfterBusinessDay(
  dateISO: string,
  reference: Date = new Date()
): boolean {
  return dateISO > getBusinessDate(reference);
}
