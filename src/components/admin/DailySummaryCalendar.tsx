"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { parseISO } from "date-fns";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DAY_OF_WEEK_SHORT } from "@/lib/constants";
import { getMonthReportDays, type MonthReportDay } from "@/lib/actions/today";
import { getMondayBasedWeekday } from "@/lib/utils/employee-calendar";
import { cn, getMonthDays, getTodayISO } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

const WEEKDAY_HEADERS = [1, 2, 3, 4, 5, 6, 7].map((d) => DAY_OF_WEEK_SHORT[d]);

const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

interface DailySummaryCalendarProps {
  selectedDate: string;
  selectedCenter: string | null;
  initialReportDays: MonthReportDay[];
}

function parseYearMonth(dateISO: string): { year: number; month: number } {
  const d = parseISO(dateISO);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function DailySummaryCalendar({
  selectedDate,
  selectedCenter,
  initialReportDays,
}: DailySummaryCalendarProps) {
  const router = useRouter();
  const today = getTodayISO();
  const selected = parseYearMonth(selectedDate);
  const [viewYear, setViewYear] = useState(selected.year);
  const [viewMonth, setViewMonth] = useState(selected.month);
  const [reportDays, setReportDays] = useState<MonthReportDay[]>(initialReportDays);
  const [isPending, startTransition] = useTransition();

  function buildUrl(date: string) {
    const params = new URLSearchParams({ date });
    if (selectedCenter) {
      params.set("center", selectedCenter);
    }
    return `/admin/resumen-diario?${params.toString()}`;
  }

  useEffect(() => {
    const { year, month } = parseYearMonth(selectedDate);
    setViewYear(year);
    setViewMonth(month);
  }, [selectedDate]);

  useEffect(() => {
    const initial = parseYearMonth(selectedDate);
    if (viewYear === initial.year && viewMonth === initial.month) {
      setReportDays(initialReportDays);
      return;
    }

    startTransition(async () => {
      try {
        const days = await getMonthReportDays(viewYear, viewMonth);
        setReportDays(days);
      } catch {
        setReportDays([]);
      }
    });
  }, [viewYear, viewMonth, selectedDate, initialReportDays]);

  const reportMap = useMemo(
    () => new Map(reportDays.map((d) => [d.date, d])),
    [reportDays]
  );

  const days = useMemo(() => {
    const daysInMonth = getMonthDays(viewYear, viewMonth);
    const result = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      result.push({
        day,
        date,
        weekday: getMondayBasedWeekday(viewYear, viewMonth, day),
      });
    }
    return result;
  }, [viewYear, viewMonth]);

  const leadingEmpty = days.length > 0 ? days[0].weekday : 0;
  const monthLabel = MONTHS[viewMonth - 1];

  function goToPrevMonth() {
    if (viewMonth === 1) {
      setViewYear((y) => y - 1);
      setViewMonth(12);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function goToNextMonth() {
    if (viewMonth === 12) {
      setViewYear((y) => y + 1);
      setViewMonth(1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function selectDate(date: string) {
    router.push(buildUrl(date));
  }

  function goToToday() {
    router.push(buildUrl(today));
  }

  const isTodaySelected = selectedDate === today;

  return (
    <Card noPadding className="overflow-hidden">
      <div className="border-b border-slate-100 bg-[var(--primary-light)]/40 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={goToPrevMonth}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="min-w-[10rem] text-center text-base font-semibold capitalize text-[var(--primary)] sm:min-w-[12rem] sm:text-lg">
              {monthLabel} {viewYear}
            </h2>
            <button
              type="button"
              onClick={goToNextMonth}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              aria-label="Mes siguiente"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <Button
            type="button"
            variant="accent"
            size="sm"
            onClick={goToToday}
            disabled={isTodaySelected}
          >
            Hoy
          </Button>
        </div>
      </div>

      <div className={cn("px-4 py-4 sm:px-6", isPending && "opacity-60")}>
        <div
          className="mb-2 grid grid-cols-7 gap-1"
          role="row"
        >
          {WEEKDAY_HEADERS.map((label) => (
            <div
              key={label}
              role="columnheader"
              className="text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:text-xs"
            >
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1" role="grid" aria-label="Calendario de resumen diario">
          {Array.from({ length: leadingEmpty }).map((_, i) => (
            <div key={`empty-${i}`} aria-hidden className="min-h-[44px]" />
          ))}

          {days.map((day) => {
            const isSelected = day.date === selectedDate;
            const isToday = day.date === today;
            const report = reportMap.get(day.date);

            return (
              <button
                key={day.date}
                type="button"
                onClick={() => selectDate(day.date)}
                aria-label={`${day.day} de ${monthLabel}${report ? ", con partes enviados" : ""}${isSelected ? ", seleccionado" : ""}`}
                aria-pressed={isSelected}
                className={cn(
                  "relative flex min-h-[44px] flex-col items-center justify-center rounded-lg border text-sm font-semibold transition-all",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 active:scale-[0.97]",
                  isSelected
                    ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-md"
                    : isToday
                      ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--primary)] hover:bg-amber-100"
                      : "border-slate-200 bg-white text-slate-700 hover:border-[var(--primary)]/30 hover:bg-[var(--primary-light)]/50"
                )}
              >
                <span>{day.day}</span>
                {report && (
                  <span
                    className={cn(
                      "mt-0.5 h-1.5 w-1.5 rounded-full",
                      isSelected
                        ? "bg-white/90"
                        : report.complete
                          ? "bg-emerald-500"
                          : "bg-[var(--accent)]"
                    )}
                    aria-hidden
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
            Todos los partes
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[var(--accent)]" aria-hidden />
            Partes parciales
          </span>
        </div>
      </div>
    </Card>
  );
}
