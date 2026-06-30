import { notFound } from "next/navigation";
import {
  getResponsibleById,
  getResponsibleSubmissionHistory,
  type ResponsibleSubmissionSummary,
} from "@/lib/actions/responsible-stats";
import { ResponsibleHistoryView } from "@/components/admin/ResponsibleHistoryView";

interface PageProps {
  params: Promise<{ id: string }>;
}

const EMPTY_SUMMARY: ResponsibleSubmissionSummary = {
  submitted: 0,
  pending: 0,
  future: 0,
};

export default async function ResponsibleHistoryPage({ params }: PageProps) {
  const { id } = await params;
  const responsible = await getResponsibleById(id);
  if (!responsible) notFound();

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  let entries: Awaited<ReturnType<typeof getResponsibleSubmissionHistory>>["entries"] = [];
  let summary: ResponsibleSubmissionSummary = { ...EMPTY_SUMMARY };

  try {
    const result = await getResponsibleSubmissionHistory(id, year, month);
    entries = result.entries;
    summary = result.summary;
  } catch {
    // Historial vacío si la consulta falla; la vista sigue mostrando datos del responsable.
  }

  return (
    <ResponsibleHistoryView
      responsibleId={id}
      responsibleName={responsible.full_name}
      centerNames={responsible.centers.map((c) => c.name)}
      initialEntries={entries}
      initialSummary={summary}
      initialYear={year}
      initialMonth={month}
    />
  );
}
