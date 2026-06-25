import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "danger" | "warning" | "info";
  className?: string;
}

const variants = {
  default: "bg-gray-100 text-gray-700 border-gray-200",
  success: "bg-green-100 text-green-800 border-green-200",
  danger: "bg-red-100 text-red-800 border-red-200",
  warning: "bg-orange-100 text-orange-800 border-orange-200",
  info: "bg-blue-100 text-blue-800 border-blue-200",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
