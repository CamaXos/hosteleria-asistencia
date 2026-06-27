import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  noPadding?: boolean;
}

export function Card({ className, title, description, children, noPadding, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white shadow-sm",
        className
      )}
      {...props}
    >
      {(title || description) && (
        <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
          {title && <h3 className="text-base font-semibold text-slate-900 sm:text-lg">{title}</h3>}
          {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
        </div>
      )}
      <div className={cn(!noPadding && (title || description ? "px-5 py-4 sm:px-6" : "p-5 sm:p-6"))}>
        {children}
      </div>
    </div>
  );
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("border-b border-slate-100 px-5 py-4 sm:px-6", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-base font-semibold text-slate-900 sm:text-lg", className)} {...props}>
      {children}
    </h3>
  );
}

export function CardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-5 py-4 sm:px-6", className)} {...props}>
      {children}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  icon,
  trend,
  variant = "default",
}: {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
  trend?: string;
  variant?: "default" | "success" | "warning" | "danger";
}) {
  const valueColors = {
    default: "text-slate-900",
    success: "text-emerald-600",
    warning: "text-amber-600",
    danger: "text-red-600",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {icon && <div className="text-slate-400">{icon}</div>}
      </div>
      <p className={cn("mt-2 text-3xl font-bold tracking-tight", valueColors[variant])}>{value}</p>
      {trend && <p className="mt-1 text-xs text-slate-400">{trend}</p>}
    </div>
  );
}
