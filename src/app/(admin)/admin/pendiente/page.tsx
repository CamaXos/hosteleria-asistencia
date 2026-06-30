import { redirect } from "next/navigation";
import { parseDateParam } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function PendientePage({ searchParams }: PageProps) {
  const { date: dateParam } = await searchParams;
  const selectedDate = parseDateParam(dateParam);
  redirect(`/admin/resumen-diario?view=pendiente&date=${selectedDate}`);
}
