import { getAssignedCenters, checkTodayReport } from "@/lib/actions/attendance";
import { CenterSelector } from "@/components/responsible/CenterSelector";
import { SuccessBanner } from "@/components/responsible/SuccessBanner";
import { Alert } from "@/components/ui/Alert";
import { getTodayISO, formatDateLong } from "@/lib/utils";
import { CalendarDays } from "lucide-react";

export default async function ResponsibleHome({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const params = await searchParams;
  const centers = await getAssignedCenters();
  const today = getTodayISO();

  const centersWithStatus = await Promise.all(
    centers.map(async (center) => {
      const report = await checkTodayReport(center.id);
      return { ...center, hasReport: !!report };
    })
  );

  const pendingCount = centersWithStatus.filter((c) => !c.hasReport).length;
  const sentCount = centersWithStatus.filter((c) => c.hasReport).length;

  if (centers.length === 0) {
    return (
      <Alert variant="warning">
        No tienes centros asignados. Contacta con el administrador.
      </Alert>
    );
  }

  return (
    <div className="space-y-5">
      {params.success === "1" && <SuccessBanner />}

      <div className="rounded-xl bg-[var(--primary)] p-5 text-white shadow-md">
        <div className="flex items-center gap-2 text-blue-100">
          <CalendarDays className="h-4 w-4" />
          <span className="text-sm">{formatDateLong(today)}</span>
        </div>
        <h2 className="mt-2 text-xl font-bold">Tus centros</h2>
        <div className="mt-3 flex gap-4 text-sm">
          <span className="rounded-lg bg-white/15 px-3 py-1">
            {sentCount} enviado{sentCount !== 1 ? "s" : ""}
          </span>
          <span className="rounded-lg bg-amber-400/30 px-3 py-1">
            {pendingCount} pendiente{pendingCount !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <CenterSelector centers={centersWithStatus} />
    </div>
  );
}
