interface LoadingProps {
  message?: string;
}

export function Loading({ message = "Cargando..." }: LoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--primary)]" />
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}
