import { cn } from "@/lib/utils/validation";
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react";

interface AlertProps {
  children: React.ReactNode;
  variant?: "info" | "success" | "warning" | "error";
  className?: string;
}

const variants = {
  info: "bg-blue-50 text-blue-800 border-blue-200",
  success: "bg-emerald-50 text-emerald-800 border-emerald-200",
  warning: "bg-amber-50 text-amber-800 border-amber-200",
  error: "bg-red-50 text-red-800 border-red-200",
};

const icons = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
};

export function Alert({ children, variant = "info", className }: AlertProps) {
  const Icon = icons[variant];
  return (
    <div className={cn("flex gap-3 rounded-xl border px-4 py-3 text-sm", variants[variant], className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">{children}</div>
    </div>
  );
}
