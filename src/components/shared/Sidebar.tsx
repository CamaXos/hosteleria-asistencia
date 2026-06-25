import Link from "next/link";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
}

interface SidebarProps {
  title: string;
  items: NavItem[];
  currentPath: string;
}

export function Sidebar({ title, items, currentPath }: SidebarProps) {
  return (
    <aside className="w-64 shrink-0 border-r border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-6 py-5">
        <h1 className="text-lg font-bold text-gray-900">{title}</h1>
        <p className="text-xs text-gray-500">Control de Asistencia</p>
      </div>
      <nav className="p-4 space-y-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "block rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              currentPath === item.href || currentPath.startsWith(item.href + "/")
                ? "bg-blue-50 text-blue-700"
                : "text-gray-700 hover:bg-gray-50"
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
