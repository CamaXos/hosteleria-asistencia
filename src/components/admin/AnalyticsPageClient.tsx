"use client";

import { useState, useEffect } from "react";
import { BarChart3, CalendarDays, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";
import { MonthlyGrid } from "@/components/admin/MonthlyGrid";
import { AnalyticsClient } from "@/components/admin/AnalyticsClient";
import type { Center, Employee } from "@/lib/types/database";
import type { MonthlyTrendPoint, EmployeeAtRisk, CenterSubmissionRate } from "@/lib/actions/analytics";

interface AnalyticsPageClientProps {
  initialYear: number;
  initialMonth: number;
  centers: Center[];
  employees: Employee[];
  initialTrends: MonthlyTrendPoint[];
  atRisk: EmployeeAtRisk[];
  centerRates: CenterSubmissionRate[];
}

const subNavItems = [
  { id: "grid", label: "Cuadrícula", icon: CalendarDays },
  { id: "trends", label: "Tendencias", icon: TrendingUp },
] as const;

export function AnalyticsPageClient({
  initialYear,
  initialMonth,
  centers,
  employees,
  initialTrends,
  atRisk,
  centerRates,
}: AnalyticsPageClientProps) {
  const now = new Date();
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [centerId, setCenterId] = useState(centers[0]?.id || "");
  const [activeSection, setActiveSection] = useState<string>("grid");

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: new Date(2000, i).toLocaleString("es", { month: "long" }),
  }));

  const yearOptions = Array.from({ length: 5 }, (_, i) => ({
    value: String(now.getFullYear() - 2 + i),
    label: String(now.getFullYear() - 2 + i),
  }));

  useEffect(() => {
    if (window.location.hash === "#grid" || window.location.hash === "#trends") {
      const id = window.location.hash.slice(1);
      setActiveSection(id);
      requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, []);

  useEffect(() => {
    const sections = subNavItems.map((item) => document.getElementById(item.id)).filter(Boolean);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) {
          setActiveSection(visible[0].target.id);
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0, 0.25, 0.5] }
    );

    sections.forEach((el) => observer.observe(el!));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--primary-light)] text-[var(--primary)]">
          <BarChart3 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analíticas</h1>
          <p className="text-sm text-slate-500">
            Cuadrícula mensual, tendencias y métricas de asistencia en un solo lugar
          </p>
        </div>
      </div>

      <nav
        aria-label="Secciones de analíticas"
        className="sticky top-[57px] z-30 -mx-4 flex gap-1 border-b border-slate-200 bg-slate-50/95 px-4 py-2 backdrop-blur-sm sm:-mx-6 sm:px-6"
      >
        {subNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={() => setActiveSection(item.id)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-[var(--primary-light)] text-[var(--primary)]"
                  : "text-slate-600 hover:bg-white hover:text-slate-900"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </a>
          );
        })}
      </nav>

      <Card>
        <div className="grid gap-4 sm:grid-cols-3">
          <Select
            label="Centro"
            options={centers.map((c) => ({ value: c.id, label: c.name }))}
            value={centerId}
            onChange={(e) => setCenterId(e.target.value)}
          />
          <Select
            label="Mes"
            options={monthOptions}
            value={String(month)}
            onChange={(e) => setMonth(Number(e.target.value))}
          />
          <Select
            label="Año"
            options={yearOptions}
            value={String(year)}
            onChange={(e) => setYear(Number(e.target.value))}
          />
        </div>
      </Card>

      <section id="grid" className="scroll-mt-28 space-y-6">
        <MonthlyGrid
          centers={centers}
          employees={employees}
          year={year}
          month={month}
          centerId={centerId}
          embedded
          title="Cuadrícula mensual"
          description="Asistencia por empleado y día del mes seleccionado"
          sectionId="grid-content"
        />
      </section>

      <div className="border-t border-slate-200" />

      <section id="trends" className="scroll-mt-28 space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--primary-light)] text-[var(--primary)]">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Gráficos y tendencias</h2>
            <p className="text-sm text-slate-500">
              Evolución diaria, tasas de envío e incidencias frecuentes
            </p>
          </div>
        </div>

        <AnalyticsClient
          year={year}
          month={month}
          centerId={centerId}
          centers={centers}
          initialTrends={initialTrends}
          atRisk={atRisk}
          centerRates={centerRates}
          embedded
        />
      </section>
    </div>
  );
}
