"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  UserCog,
  CalendarDays,
  BarChart3,
  Menu,
  X,
  ClipboardList,
  CalendarCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/shared/LogoutButton";

const navItems = [
  { href: "/admin", label: "Panel", icon: LayoutDashboard },
  { href: "/admin/resumen-diario", label: "Resumen diario", icon: CalendarCheck, primary: true },
  { href: "/admin/analytics", label: "Analíticas", icon: BarChart3 },
  { href: "/admin/centers", label: "Centros", icon: Building2 },
  { href: "/admin/employees", label: "Empleados", icon: Users },
  { href: "/admin/responsibles", label: "Responsables", icon: UserCog },
  { href: "/admin/monthly", label: "Cuadrícula", icon: CalendarDays },
];

interface AdminShellProps {
  userName: string;
  children: React.ReactNode;
}

export function AdminShell({ userName, children }: AdminShellProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  const navContent = (
    <>
      <div className="border-b border-slate-100 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)] text-white">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">Hostelería</h1>
            <p className="text-xs text-slate-500">Panel de administración</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setDrawerOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors touch-target",
                active
                  ? "bg-[var(--primary-light)] text-[var(--primary)]"
                  : "text-slate-600 hover:bg-slate-50",
                "primary" in item && item.primary && !active && "font-semibold text-[var(--primary)]"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        {navContent}
      </aside>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <aside className="fixed inset-y-0 left-0 flex w-72 flex-col bg-white shadow-xl">
            <div className="flex justify-end p-3">
              <button
                onClick={() => setDrawerOpen(false)}
                className="touch-target flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="Cerrar menú"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {navContent}
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col min-w-0">
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDrawerOpen(true)}
              className="touch-target flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" />
            </button>
            <p className="text-sm text-slate-600">
              Hola, <span className="font-semibold text-slate-900">{userName}</span>
            </p>
          </div>
          <LogoutButton />
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
