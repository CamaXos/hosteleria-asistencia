"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { AlertTriangle } from "lucide-react";
import { getErrorMessage } from "@/lib/utils";

export default function ResumenDiarioError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Resumen diario error:", error.message, error.digest);
  }, [error]);

  const detail = getErrorMessage(error);
  const isPendiente = typeof window !== "undefined" && window.location.search.includes("view=pendiente");

  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-amber-200 bg-amber-50/50 p-8 text-center">
      <AlertTriangle className="mx-auto h-12 w-12 text-amber-600" />
      <h2 className="mt-4 text-lg font-semibold text-slate-900">
        {isPendiente ? "No se pudo cargar Pendiente" : "No se pudo cargar el resumen diario"}
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        {detail || "Ha ocurrido un error al cargar los datos. Puedes reintentar o volver al panel."}
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button variant="accent" onClick={reset}>
          Reintentar
        </Button>
        <Link href="/admin">
          <Button variant="outline">Ir al panel</Button>
        </Link>
      </div>
    </div>
  );
}
