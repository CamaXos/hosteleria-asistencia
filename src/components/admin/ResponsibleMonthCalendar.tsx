"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { DAY_OF_WEEK_SHORT } from "@/lib/constants";
import type { ResponsibleSubmissionEntry } from "@/lib/actions/responsible-stats";
import { formatDate, getTodayISO } from "@/lib/utils";
import {
  buildSubmissionCalendarDays,
  type SubmissionDayStatus,
} from "@/lib/utils/responsible-calendar";
import { cn } from "@/lib/utils";

const WEEKDAY_HEADERS = [1, 2, 3, 4, 5, 6, 7].map((d) => DAY_OF_WEEK_SHORT[d]);

const DAY_CELL_STYLES: Record<SubmissionDayStatus, string> = {
  submitted: "bg-emerald-500 text-white border-emerald-600 shadow-sm",
  partial: "bg-amber-500 text-white border-amber-600 shadow-sm",
  pending: "bg-red-500 text-white border-red-600 shadow-sm",
  off: "bg-slate-100 text-slate-400 border-slate-200",
  future: "bg-slate-50 text-slate-300 border-slate-200 border-dashed",
};

const STATUS_LABELS: Record<SubmissionDayStatus, string> = {
  submitted: "Parte enviado",
  partial: "Parte parcial",
  pending: "Sin parte",
  off: "Día libre",
  future: "Futuro",
};

interface ResponsibleMonthCalendarProps {
  year: number;
  month: number;
  monthLabel: string;
  entries: ResponsibleSubmissionEntry[];
}

export function ResponsibleMonthCalendar({
  year,
  month,
  monthLabel,
  entries,
}: ResponsibleMonthCalendarProps) {
  const today = getTodayISO();
  const days = useMemo(
    () => buildSubmissionCalendarDays(year, month, entries, today),
    [year, month, entries, today]
  );

  const leadingEmpty = days.length > 0 ? days[0].weekday : 0;

  const stats = useMemo(() => {
    const counts = { submitted: 0, partial: 0, pending: 0, off: 0, future: 0 };
    for (const day of days) {
      counts[day.status]++;
    }
    return counts;
  }, [days]);

  return (
    <Card
      title="Calendario de envíos"
      description={`${monthLabel} ${year} · ${stats.submitted} enviados · ${stats.pending} pendientes · ${stats.partial} parciales`}
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
              <DayCell
                key={day.date}
                day={day.day}
                date={day.date}
                status={day.status}
                submittedTime={day.submittedTime}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        {(
          [
            { status: "submitted" as const, label: "Enviado" },
            { status: "partial" as const, label: "Parcial" },
            { status: "pending" as const, label: "Sin parte" },
            { status: "off" as const, label: "Día libre" },
          ] as const
        ).map((item) => (
          <div
            key={item.status}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-100 bg-slate-50 px-2 py-1 text-xs text-slate-600"
          >
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold",
                DAY_CELL_STYLES[item.status]
              )}
              aria-hidden
            >
              {item.status === "submitted" ? "✓" : item.status === "pending" ? "✗" : "·"}
            </span>
            <span className="text-slate-600">
              {item.status === "submitted" ? "Enviado a las HH:mm" : item.label}
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
  submittedTime,
}: {
  day: number;
  date: string;
  status: SubmissionDayStatus;
  submittedTime: string | null;
}) {
  const label = STATUS_LABELS[status];
  const timePart = submittedTime ? ` a las ${submittedTime}` : "";
  const tooltip = `${formatDate(date)} · ${label}${timePart}`;

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
        {submittedTime && (status === "submitted" || status === "partial") && (
          <span className="mt-0.5 text-[8px] font-bold opacity-90 sm:text-[9px]">
            {submittedTime}
          </span>
        )}
      </div>

      <div
        className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-[#1e3a5f] px-2 py-1 text-xs text-white shadow-lg group-hover:block group-focus-within:block"
        role="tooltip"
      >
        {tooltip}
        <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-[#1e3a5f]" />
      </div>
    </div>
  );
}
