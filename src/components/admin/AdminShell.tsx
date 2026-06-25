"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/shared/Sidebar";
import { LogoutButton } from "@/components/shared/LogoutButton";

const navItems = [
  { href: "/admin", label: "Panel" },
  { href: "/admin/centers", label: "Centros" },
  { href: "/admin/employees", label: "Empleados" },
  { href: "/admin/responsibles", label: "Responsables" },
  { href: "/admin/monthly", label: "Cuadrícula mensual" },
];

interface AdminShellProps {
  userName: string;
  children: React.ReactNode;
}

export function AdminShell({ userName, children }: AdminShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      <Sidebar title="Administración" items={navItems} currentPath={pathname} />
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <p className="text-sm text-gray-600">
            Hola, <span className="font-medium text-gray-900">{userName}</span>
          </p>
          <LogoutButton />
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
