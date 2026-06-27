import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function EmployeeHistoryNotFound() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <h1 className="text-2xl font-bold text-slate-900">Empleado no encontrado</h1>
      <p className="mt-2 text-sm text-slate-500">
        No existe ningún empleado con este identificador o ya no está disponible.
      </p>
      <Link
        href="/admin/employees"
        className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a empleados
      </Link>
    </div>
  );
}
