"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Alert } from "@/components/ui/Alert";

export function SuccessBanner() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/responsible");
    }, 5000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <Alert variant="success" className="flex items-center gap-3 animate-in fade-in">
      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
      <div>
        <p className="font-semibold">¡Informe enviado correctamente!</p>
        <p className="text-xs opacity-80">El control de asistencia de hoy ha sido registrado.</p>
      </div>
    </Alert>
  );
}
