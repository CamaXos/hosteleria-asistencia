import { cn } from "@/lib/utils/validation";

interface AlertProps {
  children: React.ReactNode;
  variant?: "info" | "success" | "warning" | "error";
  className?: string;
}

const variants = {
  info: "bg-blue-50 text-blue-800 border-blue-200",
  success: "bg-green-50 text-green-800 border-green-200",
  warning: "bg-yellow-50 text-yellow-800 border-yellow-200",
  error: "bg-red-50 text-red-800 border-red-200",
};

export function Alert({ children, variant = "info", className }: AlertProps) {
  return (
    <div className={cn("rounded-lg border px-4 py-3 text-sm", variants[variant], className)}>
      {children}
    </div>
  );
}
