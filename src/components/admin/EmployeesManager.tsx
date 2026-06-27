"use client";

import { useState } from "react";
import Link from "next/link";
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
import { getErrorMessage } from "@/lib/utils";
import type { Center, Employee } from "@/lib/types/database";

interface EmployeesManagerProps {
  employees: Employee[];
  centers: Center[];
}

export function EmployeesManager({ employees, centers }: EmployeesManagerProps) {
  const [centerFilter, setCenterFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [deactivating, setDeactivating] = useState<Employee | null>(null);
  const [deactivateNotes, setDeactivateNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const filtered = centerFilter
    ? employees.filter((e) => e.center_id === centerFilter)
    : employees;

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

  const centerName = (id: string) => centers.find((c) => c.id === id)?.name ?? "—";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empleados</h1>
          <p className="text-sm text-gray-500">Gestiona el personal de los centros</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true); }}>
          Nuevo empleado
        </Button>
      </div>

      <div className="max-w-xs">
        <Select
          label="Filtrar por centro"
          value={centerFilter}
          onChange={(e) => setCenterFilter(e.target.value)}
          options={centers.map((c) => ({ value: c.id, label: c.name }))}
          placeholder="Todos los centros"
        />
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2 pr-4">Nombre</th>
                <th className="pb-2 pr-4">Centro</th>
                <th className="pb-2 pr-4">Puesto</th>
                <th className="pb-2 pr-4">Estado</th>
                <th className="pb-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp) => (
                <tr key={emp.id} className="border-b border-gray-50">
                  <td className="py-3 pr-4 font-medium">{emp.full_name}</td>
                  <td className="py-3 pr-4 text-gray-600">{centerName(emp.center_id)}</td>
                  <td className="py-3 pr-4 text-gray-600">{emp.position || "—"}</td>
                  <td className="py-3 pr-4">
                    <Badge variant={emp.active ? "success" : "danger"}>
                      {emp.active ? "Activo" : "Inactivo"}
                    </Badge>
                  </td>
                  <td className="py-3 flex gap-2 flex-wrap">
                    <Link href={`/admin/employees/${emp.id}/history`}>
                      <Button variant="ghost" size="sm">Ver historial</Button>
                    </Link>
                    <Button variant="ghost" size="sm" onClick={() => { setEditing(emp); setShowForm(true); }}>
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
                  </td>
                </tr>
              ))}
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
          {!editing && (
            <Input name="start_date" label="Fecha de inicio" type="date" defaultValue={new Date().toISOString().split("T")[0]} />
          )}
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
        <p className="text-sm text-gray-600 mb-4">
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
