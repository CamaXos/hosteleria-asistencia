"use client";

import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/shared/LogoutButton";

interface ResponsibleShellProps {
  userName: string;
  children: React.ReactNode;
}

export function ResponsibleShell({ userName, children }: ResponsibleShellProps) {
  const pathname = usePathname();
  const isReport = pathname.includes("/report/");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Control de Asistencia</h1>
            {!isReport && (
              <p className="text-sm text-gray-500">Hola, {userName}</p>
            )}
          </div>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto max-w-3xl p-4 sm:p-6">{children}</main>
    </div>
  );
}
