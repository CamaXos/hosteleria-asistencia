import { getAssignedCenters, checkTodayReport } from "@/lib/actions/attendance";
import { CenterSelector } from "@/components/responsible/CenterSelector";
import { Alert } from "@/components/ui/Alert";
import { getTodayISO, formatDateLong } from "@/lib/utils";

export default async function ResponsibleHome() {
  const centers = await getAssignedCenters();
  const today = getTodayISO();

  const centersWithStatus = await Promise.all(
    centers.map(async (center) => {
      const report = await checkTodayReport(center.id);
      return { ...center, hasReport: !!report };
    })
  );

  if (centers.length === 0) {
    return (
      <Alert variant="warning">
        No tienes centros asignados. Contacta con el administrador.
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Selecciona un centro</h2>
        <p className="text-sm text-gray-500">
          Control de asistencia del {formatDateLong(today)}
        </p>
      </div>

      <CenterSelector centers={centersWithStatus} />
    </div>
  );
}
