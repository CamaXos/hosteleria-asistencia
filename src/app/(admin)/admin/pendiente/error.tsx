"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { AlertTriangle } from "lucide-react";

export default function PendienteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Pendiente page error:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-amber-200 bg-amber-50/50 p-8 text-center">
      <AlertTriangle className="mx-auto h-12 w-12 text-amber-600" />
      <h2 className="mt-4 text-lg font-semibold text-slate-900">
        No se pudo cargar Pendiente
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        Ha ocurrido un error al cargar los centros pendientes. Puedes reintentar o
        volver al resumen diario.
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button variant="accent" onClick={reset}>
          Reintentar
        </Button>
        <Link href="/admin/resumen-diario">
          <Button variant="outline">Ir a resumen diario</Button>
        </Link>
      </div>
    </div>
  );
}
