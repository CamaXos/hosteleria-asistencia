import { requireRole, getProfile } from "@/lib/auth";
import { ResponsibleShell } from "@/components/responsible/ResponsibleShell";

export default async function ResponsibleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole("responsible");
  return (
    <ResponsibleShell userName={profile.full_name}>
      {children}
    </ResponsibleShell>
  );
}
