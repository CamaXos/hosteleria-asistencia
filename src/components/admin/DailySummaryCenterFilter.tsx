"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/Select";
import { Building2 } from "lucide-react";

interface DailySummaryCenterFilterProps {
  centers: { id: string; name: string }[];
  selectedCenter: string | null;
  selectedDate: string;
}

export function DailySummaryCenterFilter({
  centers,
  selectedCenter,
  selectedDate,
}: DailySummaryCenterFilterProps) {
  const router = useRouter();

  function handleChange(value: string) {
    const params = new URLSearchParams({ date: selectedDate });
    if (value) {
      params.set("center", value);
    }
    router.push(`/admin/resumen-diario?${params.toString()}`);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-[var(--primary-light)]/30 px-4 py-3 sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-[var(--primary)]">
          <Building2 className="h-4 w-4 shrink-0" />
          <span>Estadísticas por centro</span>
        </div>
        <div className="w-full sm:max-w-xs">
          <Select
            label="Filtrar por centro"
            value={selectedCenter ?? ""}
            onChange={(e) => handleChange(e.target.value)}
            options={centers.map((c) => ({ value: c.id, label: c.name }))}
            placeholder="Todos los centros"
            className="min-h-[44px] border-slate-300 bg-white py-2.5 text-base sm:min-h-0 sm:text-sm"
          />
        </div>
      </div>
    </div>
  );
}
