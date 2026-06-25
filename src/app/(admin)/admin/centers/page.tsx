import { getCenters } from "@/lib/actions/centers";
import { CentersManager } from "@/components/admin/CentersManager";

export default async function CentersPage() {
  const centers = await getCenters();
  return <CentersManager centers={centers} />;
}
