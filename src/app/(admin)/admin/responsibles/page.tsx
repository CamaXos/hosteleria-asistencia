import { getResponsibles, validateCenterResponsibles } from "@/lib/actions/employees";
import { getCenters } from "@/lib/actions/centers";
import { ResponsiblesManager } from "@/components/admin/ResponsiblesManager";

export default async function ResponsiblesPage() {
  const [responsibles, centers] = await Promise.all([getResponsibles(), getCenters()]);

  const counts: Record<string, number> = {};
  for (const center of centers) {
    const { count } = await validateCenterResponsibles(center.id);
    counts[center.id] = count;
  }

  return (
    <ResponsiblesManager
      responsibles={responsibles}
      centers={centers}
      centerResponsibleCounts={counts}
    />
  );
}
