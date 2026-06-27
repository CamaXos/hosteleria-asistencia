"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/shared/LogoutButton";

interface ResponsibleShellProps {
  userName: string;
  children: React.ReactNode;
}

export function ResponsibleShell({ userName, children }: ResponsibleShellProps) {
  const pathname = usePathname();
  const isHome = pathname === "/responsible";
  const isReport = pathname.includes("/report/");

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--primary)] text-white">
              <ClipboardList className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">Control de Asistencia</h1>
              {!isReport && (
                <p className="text-xs text-slate-500">Hola, {userName}</p>
              )}
            </div>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className={cn(
        "mx-auto w-full max-w-2xl flex-1 p-4",
        isReport && "pb-24"
      )}>
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.06)] safe-area-pb">
        <div className="mx-auto flex max-w-2xl">
          <Link
            href="/responsible"
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors touch-target",
              isHome
                ? "text-[var(--primary)]"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Building2 className="h-5 w-5" />
            Mis centros
          </Link>
        </div>
      </nav>
    </div>
  );
}
