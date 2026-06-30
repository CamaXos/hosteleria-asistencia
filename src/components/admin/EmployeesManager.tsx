"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown, Users } from "lucide-react";
import {
  createEmployee,
  deactivateEmployee,
  activateEmployee,
  updateEmployee,
} from "@/lib/actions/employees";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Textarea } from "@/components/ui/Textarea";
import { formatDate, getErrorMessage, getTodayISO } from "@/lib/utils";
import type { Center, Employee } from "@/lib/types/database";

type SortField = "name" | "center" | "position" | "start_date" | "active";
type SortOrder = "asc" | "desc";
type ActiveFilter = "all" | "active" | "inactive";

const SORT_LABELS: Record<SortField, string> = {
  name: "Nombre",
  center: "Centro",
  position: "Puesto",
  start_date: "Fecha de alta",
  active: "Estado",
};

interface EmployeesManagerProps {
  employees: Employee[];
  centers: Center[];
}

function parseSortField(value: string | null): SortField {
  if (value && value in SORT_LABELS) return value as SortField;
  return "name";
}

function parseSortOrder(value: string | null): SortOrder {
  return value === "desc" ? "desc" : "asc";
}

function parseActiveFilter(value: string | null): ActiveFilter {
  if (value === "active" || value === "inactive") return value;
  return "all";
}

export function EmployeesManager({ employees, centers }: EmployeesManagerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [deactivating, setDeactivating] = useState<Employee | null>(null);
  const [deactivateNotes, setDeactivateNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const centerFilter = searchParams.get("center") ?? "";
  const nameSearch = searchParams.get("q") ?? "";
  const positionFilter = searchParams.get("position") ?? "";
  const activeFilter = parseActiveFilter(searchParams.get("status"));
  const sortField = parseSortField(searchParams.get("sort"));
  const sortOrder = parseSortOrder(searchParams.get("order"));

  const positions = useMemo(
    () =>
      [...new Set(employees.map((e) => e.position).filter(Boolean) as string[])].sort((a, b) =>
        a.localeCompare(b, "es")
      ),
    [employees]
  );

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      const qs = params.toString();
      router.replace(qs ? `/admin/employees?${qs}` : "/admin/employees", { scroll: false });
    },
    [router, searchParams]
  );

  const centerName = useCallback(
    (id: string) => centers.find((c) => c.id === id)?.name ?? "—",
    [centers]
  );

  const filtered = useMemo(() => {
    let result = employees;

    if (centerFilter) {
      result = result.filter((e) => e.center_id === centerFilter);
    }

    if (activeFilter === "active") {
      result = result.filter((e) => e.active);
    } else if (activeFilter === "inactive") {
      result = result.filter((e) => !e.active);
    }

    if (nameSearch.trim()) {
      const q = nameSearch.trim().toLowerCase();
      result = result.filter((e) => e.full_name.toLowerCase().includes(q));
    }

    if (positionFilter) {
      result = result.filter((e) => e.position === positionFilter);
    }

    return result;
  }, [employees, centerFilter, activeFilter, nameSearch, positionFilter]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    const dir = sortOrder === "asc" ? 1 : -1;

    list.sort((a, b) => {
      switch (sortField) {
        case "center": {
          const cmp = centerName(a.center_id).localeCompare(centerName(b.center_id), "es");
          return cmp * dir;
        }
        case "position": {
          const cmp = (a.position ?? "").localeCompare(b.position ?? "", "es");
          return cmp * dir;
        }
        case "start_date": {
          const cmp = a.start_date.localeCompare(b.start_date);
          return cmp * dir;
        }
        case "active": {
          const cmp = Number(a.active) - Number(b.active);
          return cmp * dir;
        }
        default: {
          const cmp = a.full_name.localeCompare(b.full_name, "es");
          return cmp * dir;
        }
      }
    });

    return list;
  }, [filtered, sortField, sortOrder, centerName]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      updateParams({ order: sortOrder === "asc" ? "desc" : "asc" });
    } else {
      updateParams({ sort: field, order: "asc" });
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 inline h-3.5 w-3.5 opacity-40" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="ml-1 inline h-3.5 w-3.5 text-[var(--accent)]" />
    ) : (
      <ArrowDown className="ml-1 inline h-3.5 w-3.5 text-[var(--accent)]" />
    );
  }

  function SortableHeader({
    field,
    label,
    className = "",
  }: {
    field: SortField;
    label: string;
    className?: string;
  }) {
    return (
      <th className={`pb-2 pr-4 ${className}`}>
        <button
          type="button"
          onClick={() => handleSort(field)}
          className="inline-flex items-center font-medium text-slate-600 transition-colors hover:text-[var(--primary)] focus:outline-none focus-visible:text-[var(--primary)]"
        >
          {label}
          <SortIcon field={field} />
        </button>
      </th>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const formData = new FormData(e.currentTarget);

    try {
      if (editing) {
        await updateEmployee(editing.id, formData);
      } else {
        await createEmployee(formData);
      }
      window.location.reload();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleDeactivate() {
    if (!deactivating) return;
    setLoading(true);
    try {
      await deactivateEmployee(deactivating.id, deactivateNotes);
      setDeactivating(null);
      setDeactivateNotes("");
      window.location.reload();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleActivate(employee: Employee) {
    setLoading(true);
    try {
      await activateEmployee(employee.id);
      window.location.reload();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const today = getTodayISO();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Empleados</h1>
          <p className="text-sm text-slate-500">Gestiona el personal de los centros</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true); }}>
          Nuevo empleado
        </Button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-[var(--primary-light)]/30 px-4 py-4 sm:px-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--primary)]">
          <Users className="h-4 w-4 shrink-0" />
          <span>Filtrar y ordenar</span>
          <Badge variant="default" className="ml-auto sm:ml-2">
            {sorted.length} empleado{sorted.length !== 1 ? "s" : ""}
          </Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            label="Buscar por nombre"
            value={nameSearch}
            onChange={(e) => updateParams({ q: e.target.value || null })}
            placeholder="Nombre del empleado…"
            className="min-h-[44px] border-slate-300 bg-white py-2.5 text-base sm:min-h-0 sm:text-sm"
          />
          <Select
            label="Centro"
            value={centerFilter}
            onChange={(e) => updateParams({ center: e.target.value || null })}
            options={centers.map((c) => ({ value: c.id, label: c.name }))}
            placeholder="Todos los centros"
            className="min-h-[44px] border-slate-300 bg-white py-2.5 text-base sm:min-h-0 sm:text-sm"
          />
          <Select
            label="Estado"
            value={activeFilter}
            onChange={(e) =>
              updateParams({
                status: e.target.value === "all" ? null : e.target.value,
              })
            }
            options={[
              { value: "all", label: "Todos" },
              { value: "active", label: "Activos" },
              { value: "inactive", label: "Inactivos" },
            ]}
            className="min-h-[44px] border-slate-300 bg-white py-2.5 text-base sm:min-h-0 sm:text-sm"
          />
          {positions.length > 0 && (
            <Select
              label="Puesto"
              value={positionFilter}
              onChange={(e) => updateParams({ position: e.target.value || null })}
              options={positions.map((p) => ({ value: p, label: p }))}
              placeholder="Todos los puestos"
              className="min-h-[44px] border-slate-300 bg-white py-2.5 text-base sm:min-h-0 sm:text-sm"
            />
          )}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:hidden">
          <Select
            label="Ordenar por"
            value={sortField}
            onChange={(e) => updateParams({ sort: e.target.value })}
            options={Object.entries(SORT_LABELS).map(([value, label]) => ({ value, label }))}
            className="min-h-[44px] border-slate-300 bg-white py-2.5 text-base"
          />
          <Select
            label="Dirección"
            value={sortOrder}
            onChange={(e) => updateParams({ order: e.target.value })}
            options={[
              { value: "asc", label: "Ascendente" },
              { value: "desc", label: "Descendente" },
            ]}
            className="min-h-[44px] border-slate-300 bg-white py-2.5 text-base"
          />
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <SortableHeader field="name" label="Nombre" className="hidden sm:table-cell" />
                <th className="pb-2 pr-4 sm:hidden">Empleado</th>
                <SortableHeader field="center" label="Centro" className="hidden md:table-cell" />
                <SortableHeader field="position" label="Puesto" className="hidden lg:table-cell" />
                <SortableHeader field="start_date" label="Fecha de alta" className="hidden md:table-cell" />
                <SortableHeader field="active" label="Estado" />
                <th className="pb-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No hay empleados que coincidan con los filtros
                  </td>
                </tr>
              ) : (
                sorted.map((emp) => (
                  <tr key={emp.id} className="border-b border-slate-50">
                    <td className="py-3 pr-4">
                      <div className="font-medium text-slate-900">{emp.full_name}</div>
                      <div className="mt-0.5 text-xs text-slate-500 md:hidden">
                        {centerName(emp.center_id)}
                        {emp.position ? ` · ${emp.position}` : ""}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500 md:hidden">
                        Alta: {formatDate(emp.start_date)}
                      </div>
                    </td>
                    <td className="hidden py-3 pr-4 text-slate-600 md:table-cell">
                      {centerName(emp.center_id)}
                    </td>
                    <td className="hidden py-3 pr-4 text-slate-600 lg:table-cell">
                      {emp.position || "—"}
                    </td>
                    <td className="hidden py-3 pr-4 text-slate-600 md:table-cell">
                      {formatDate(emp.start_date)}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant={emp.active ? "success" : "danger"}>
                        {emp.active ? "Activo" : "Inactivo"}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/admin/employees/${emp.id}/history`}>
                          <Button variant="ghost" size="sm">Ver historial</Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setEditing(emp); setShowForm(true); }}
                        >
                          Editar
                        </Button>
                        {emp.active ? (
                          <Button variant="ghost" size="sm" onClick={() => setDeactivating(emp)}>
                            Dar de baja
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={() => handleActivate(emp)}>
                            Activar
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={showForm}
        onClose={() => { setShowForm(false); setEditing(null); }}
        title={editing ? "Editar empleado" : "Nuevo empleado"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            name="center_id"
            label="Centro"
            required
            defaultValue={editing?.center_id}
            options={centers.filter((c) => c.active).map((c) => ({ value: c.id, label: c.name }))}
            placeholder="Selecciona un centro"
          />
          <Input name="full_name" label="Nombre completo" defaultValue={editing?.full_name} required />
          <Input name="dni_nie" label="DNI/NIE" defaultValue={editing?.dni_nie || ""} />
          <Input name="phone" label="Teléfono" defaultValue={editing?.phone || ""} />
          <Input name="position" label="Puesto" defaultValue={editing?.position || ""} />
          <Input
            name="start_date"
            label="Fecha de alta"
            type="date"
            defaultValue={editing?.start_date ?? today}
            required
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button type="submit" loading={loading}>{editing ? "Guardar" : "Crear"}</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!deactivating}
        onClose={() => setDeactivating(null)}
        title="Confirmar baja"
        onConfirm={handleDeactivate}
        confirmLabel="Confirmar baja"
        variant="danger"
        loading={loading}
      >
        <p className="mb-4 text-sm text-slate-600">
          ¿Dar de baja a <strong>{deactivating?.full_name}</strong>?
        </p>
        <Textarea
          label="Motivo (opcional)"
          value={deactivateNotes}
          onChange={(e) => setDeactivateNotes(e.target.value)}
          rows={3}
        />
      </Modal>
    </div>
  );
}
