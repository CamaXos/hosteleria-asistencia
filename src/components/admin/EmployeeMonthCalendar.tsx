"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import {
  ATTENDANCE_STATUS_CODES,
  ATTENDANCE_STATUS_LABELS,
  DAY_OF_WEEK_SHORT,
} from "@/lib/constants";
import type { EmployeeHistoryEntry } from "@/lib/actions/responsible-stats";
import { formatDate } from "@/lib/utils";
import {
  buildMonthCalendarDays,
  type MonthDayStatus,
} from "@/lib/utils/employee-calendar";
import { cn } from "@/lib/utils";

const WEEKDAY_HEADERS = [1, 2, 3, 4, 5, 6, 7].map((d) => DAY_OF_WEEK_SHORT[d]);

const DAY_CELL_STYLES: Record<MonthDayStatus, string> = {
  worked: "bg-emerald-500 text-white border-emerald-600 shadow-sm",
  day_off: "bg-blue-400 text-white border-blue-500 shadow-sm",
  vacation: "bg-slate-400 text-white border-slate-500 shadow-sm",
  absence: "bg-red-500 text-white border-red-600 shadow-sm",
  sick: "bg-orange-500 text-white border-orange-600 shadow-sm",
  inactive: "bg-red-400 text-white border-red-500 shadow-sm",
  other: "bg-amber-500 text-white border-amber-600 shadow-sm",
  none: "bg-slate-50 text-slate-400 border-slate-200 border-dashed",
};

const LEGEND_ITEMS: { code: string; label: string; status: MonthDayStatus }[] = [
  { code: "T", label: "Trabajado", status: "worked" },
  { code: "L", label: "Libre", status: "day_off" },
  { code: "V", label: "Vacaciones", status: "vacation" },
  { code: "F", label: "Falta", status: "absence" },
  { code: "E", label: "Enfermedad", status: "sick" },
  { code: "B", label: "Baja", status: "inactive" },
  { code: "—", label: "Sin datos", status: "none" },
];

function getStatusLabel(status: MonthDayStatus): string {
  if (status === "none") return "Sin datos";
  return ATTENDANCE_STATUS_LABELS[status];
}

function getStatusCode(status: MonthDayStatus): string {
  if (status === "none") return "—";
  return ATTENDANCE_STATUS_CODES[status];
}

interface EmployeeMonthCalendarProps {
  year: number;
  month: number;
  monthLabel: string;
  entries: EmployeeHistoryEntry[];
}

export function EmployeeMonthCalendar({
  year,
  month,
  monthLabel,
  entries,
}: EmployeeMonthCalendarProps) {
  const days = useMemo(
    () => buildMonthCalendarDays(year, month, entries),
    [year, month, entries]
  );

  const leadingEmpty = days.length > 0 ? days[0].weekday : 0;
  const stats = useMemo(() => {
    const counts = {
      worked: 0,
      absent: 0,
      off: 0,
      none: 0,
    };

    for (const day of days) {
      if (day.status === "worked") counts.worked++;
      else if (day.status === "day_off" || day.status === "vacation") counts.off++;
      else if (day.status === "none") counts.none++;
      else counts.absent++;
    }

    return counts;
  }, [days]);

  return (
    <Card
      title="Calendario del mes"
      description={`${monthLabel} ${year} · ${stats.worked} trabajados · ${stats.absent} ausencias · ${stats.off} libres/vacaciones · ${stats.none} sin datos`}
    >
      <div className="overflow-x-auto -mx-1 px-1 pb-1">
        <div className="min-w-[280px] sm:min-w-0">
          <div className="mb-2 grid grid-cols-7 gap-1 sm:gap-1.5">
            {WEEKDAY_HEADERS.map((label) => (
              <div
                key={label}
                className="text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:text-xs"
              >
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {Array.from({ length: leadingEmpty }).map((_, i) => (
              <div key={`empty-${i}`} aria-hidden className="aspect-square" />
            ))}

            {days.map((day) => (
              <DayCell key={day.date} day={day.day} date={day.date} status={day.status} />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        {LEGEND_ITEMS.map((item) => (
          <div
            key={item.code}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-100 bg-slate-50 px-2 py-1 text-xs text-slate-600"
          >
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold",
                DAY_CELL_STYLES[item.status]
              )}
              aria-hidden
            >
              {item.code}
            </span>
            <span>
              <span className="font-medium text-slate-700">{item.code}</span>
              <span className="text-slate-500">={item.label}</span>
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function DayCell({
  day,
  date,
  status,
}: {
  day: number;
  date: string;
  status: MonthDayStatus;
}) {
  const tooltip = `${formatDate(date)} · ${getStatusLabel(status)} (${getStatusCode(status)})`;

  return (
    <div className="group relative aspect-square">
      <div
        title={tooltip}
        className={cn(
          "flex h-full w-full flex-col items-center justify-center rounded-md border text-xs font-semibold transition-transform sm:rounded-lg sm:text-sm",
          "group-hover:scale-105 group-focus-within:scale-105",
          DAY_CELL_STYLES[status]
        )}
        tabIndex={0}
        role="gridcell"
        aria-label={tooltip}
      >
        <span>{day}</span>
        {status !== "none" && (
          <span className="mt-0.5 text-[9px] font-bold opacity-90 sm:text-[10px]">
            {getStatusCode(status)}
          </span>
        )}
      </div>

      <div
        className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-[#1e3a5f] px-2 py-1 text-xs text-white shadow-lg group-hover:block group-focus-within:block sm:group-hover:block"
        role="tooltip"
      >
        {tooltip}
        <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-[#1e3a5f]" />
      </div>
    </div>
  );
}
