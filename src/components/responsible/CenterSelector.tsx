"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
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
      return (
        <Card>
          <AlertSubmitted centerName={center.name} />
        </Card>
      );
    }
    return (
      <Link href={`/responsible/report/${center.id}`}>
        <Card className="cursor-pointer transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">{center.name}</h3>
              {center.address && <p className="text-sm text-gray-500">{center.address}</p>}
            </div>
            <Badge variant="warning">Pendiente</Badge>
          </div>
          <Button className="mt-4 w-full" size="lg">
            Comenzar control de hoy
          </Button>
        </Card>
      </Link>
    );
  }

  return (
    <div className="space-y-4">
      {centers.map((center) => (
        <Card key={center.id}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold">{center.name}</h3>
              {center.address && <p className="text-sm text-gray-500">{center.address}</p>}
            </div>
            {center.hasReport ? (
              <Badge variant="success">Enviado</Badge>
            ) : (
              <Link href={`/responsible/report/${center.id}`}>
                <Button size="lg">Control de hoy</Button>
              </Link>
            )}
          </div>
          {center.hasReport && <AlertSubmitted centerName={center.name} />}
        </Card>
      ))}
    </div>
  );
}

function AlertSubmitted({ centerName }: { centerName: string }) {
  return (
    <p className="mt-3 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
      El control de asistencia de hoy ya ha sido enviado para {centerName}.
    </p>
  );
}
