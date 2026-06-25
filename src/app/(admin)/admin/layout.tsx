import { requireRole, getProfile } from "@/lib/auth";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("admin");
  const profile = await getProfile();

  return (
    <AdminShell userName={profile?.full_name || "Admin"}>
      {children}
    </AdminShell>
  );
}
