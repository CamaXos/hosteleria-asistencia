import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "accent" | "secondary" | "outline" | "danger" | "ghost" | "success";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const variants = {
  primary: "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] focus:ring-[var(--primary)] shadow-sm",
  accent: "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] focus:ring-[var(--accent)] shadow-sm",
  secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-400",
  outline: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-400",
  danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm",
  ghost: "bg-transparent text-slate-600 hover:bg-slate-100 focus:ring-slate-400",
  success: "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500 shadow-sm",
};

const sizes = {
  sm: "px-3 py-2 text-sm min-h-[36px]",
  md: "px-4 py-2.5 text-sm min-h-[44px]",
  lg: "px-6 py-3 text-base min-h-[48px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all",
        "focus:outline-none focus:ring-2 focus:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
);
Button.displayName = "Button";
