import { getActiveResponsibles, getInactiveResponsibles, validateCenterResponsibles } from "@/lib/actions/employees";
import { getCenters } from "@/lib/actions/centers";
import { ResponsiblesManager } from "@/components/admin/ResponsiblesManager";

export default async function ResponsiblesPage() {
  const [activeResponsibles, inactiveResponsibles, centers] = await Promise.all([
    getActiveResponsibles(),
    getInactiveResponsibles(),
    getCenters(),
  ]);

  const counts: Record<string, number> = {};
  for (const center of centers) {
    const { count } = await validateCenterResponsibles(center.id);
    counts[center.id] = count;
  }

  return (
    <ResponsiblesManager
      activeResponsibles={activeResponsibles}
      inactiveResponsibles={inactiveResponsibles}
      centers={centers}
      centerResponsibleCounts={counts}
    />
  );
}
