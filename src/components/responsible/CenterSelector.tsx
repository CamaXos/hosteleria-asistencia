"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Building2, CheckCircle2, ChevronRight, MapPin } from "lucide-react";
import type { Center } from "@/lib/types/database";

interface CenterWithStatus extends Center {
  hasReport: boolean;
}

interface CenterSelectorProps {
  centers: CenterWithStatus[];
}

export function CenterSelector({ centers }: CenterSelectorProps) {
  if (centers.length === 1) {
    const center = centers[0];
    if (center.hasReport) {
      return <SuccessCard centerName={center.name} />;
    }
    return (
      <Link href={`/responsible/report/${center.id}`} className="block">
        <Card className="cursor-pointer border-2 border-transparent transition-all hover:border-[var(--primary)] hover:shadow-md active:scale-[0.99]">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-light)] text-[var(--primary)]">
              <Building2 className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-slate-900">{center.name}</h3>
                <Badge variant="warning">Pendiente</Badge>
              </div>
              {center.address && (
                <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                  <MapPin className="h-3.5 w-3.5" />
                  {center.address}
                </p>
              )}
            </div>
          </div>
          <Button variant="accent" className="mt-5 w-full" size="lg">
            Comenzar control de hoy
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Card>
      </Link>
    );
  }

  return (
    <div className="space-y-3">
      {centers.map((center) => (
        <Card key={center.id} className={!center.hasReport ? "border-l-4 border-l-amber-400" : "border-l-4 border-l-emerald-500"}>
          <div className="flex items-start gap-4">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              center.hasReport ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
            }`}>
              {center.hasReport ? <CheckCircle2 className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-slate-900">{center.name}</h3>
                {center.hasReport ? (
                  <Badge variant="success">Enviado</Badge>
                ) : (
                  <Badge variant="warning">Pendiente</Badge>
                )}
              </div>
              {center.address && (
                <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-500">
                  <MapPin className="h-3.5 w-3.5" />
                  {center.address}
                </p>
              )}
              {center.hasReport ? (
                <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  Informe de hoy enviado correctamente.
                </p>
              ) : (
                <Link href={`/responsible/report/${center.id}`} className="mt-3 block">
                  <Button variant="accent" className="w-full" size="lg">
                    Control de hoy
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function SuccessCard({ centerName }: { centerName: string }) {
  return (
    <Card className="border-l-4 border-l-emerald-500 text-center">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
        <CheckCircle2 className="h-8 w-8 text-emerald-600" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900">¡Informe enviado!</h3>
      <p className="mt-2 text-sm text-slate-600">
        El control de asistencia de hoy para <strong>{centerName}</strong> ya ha sido registrado.
      </p>
    </Card>
  );
}
