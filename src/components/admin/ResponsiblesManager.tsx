"use client";

import { useState } from "react";
import Link from "next/link";
import {
  createResponsible,
  updateResponsibleAssignments,
  toggleResponsibleActive,
} from "@/lib/actions/employees";
import { ScheduleEditor } from "@/components/admin/ScheduleEditor";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { getErrorMessage } from "@/lib/utils";
import { MIN_RESPONSIBLES_PER_CENTER, MAX_RESPONSIBLES_PER_CENTER } from "@/lib/constants";
import type { Center, Profile, ResponsibleSchedule } from "@/lib/types/database";

type ResponsibleWithCenters = Profile & { center_ids: string[] };

interface ResponsiblesManagerProps {
  responsibles: ResponsibleWithCenters[];
  centers: Center[];
  centerResponsibleCounts: Record<string, number>;
  allSchedules: ResponsibleSchedule[];
}

export function ResponsiblesManager({
  responsibles,
  centers,
  centerResponsibleCounts,
  allSchedules,
}: ResponsiblesManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ResponsibleWithCenters | null>(null);
  const [scheduling, setScheduling] = useState<ResponsibleWithCenters | null>(null);
  const [selectedCenters, setSelectedCenters] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function openEdit(resp: ResponsibleWithCenters) {
    setEditing(resp);
    setSelectedCenters(resp.center_ids);
    setShowForm(true);
  }

  function openCreate() {
    setEditing(null);
    setSelectedCenters([]);
    setShowForm(true);
  }

  function toggleCenter(centerId: string) {
    setSelectedCenters((prev) =>
      prev.includes(centerId) ? prev.filter((id) => id !== centerId) : [...prev, centerId]
    );
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    selectedCenters.forEach((id) => formData.append("center_ids", id));

    try {
      await createResponsible(formData);
      setShowForm(false);
      window.location.reload();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateAssignments() {
    if (!editing) return;
    setError("");
    setLoading(true);
    try {
      await updateResponsibleAssignments(editing.id, selectedCenters);
      setShowForm(false);
      window.location.reload();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleActive(id: string, active: boolean) {
    setLoading(true);
    try {
      await toggleResponsibleActive(id, !active);
      window.location.reload();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const centerNames = (ids: string[]) =>
    ids.map((id) => centers.find((c) => c.id === id)?.name).filter(Boolean).join(", ") || "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Responsables</h1>
          <p className="text-sm text-gray-500">
            Cada centro debe tener entre {MIN_RESPONSIBLES_PER_CENTER} y {MAX_RESPONSIBLES_PER_CENTER} responsables
          </p>
        </div>
        <Button onClick={openCreate}>Nuevo responsable</Button>
      </div>

      <Alert variant="info">
        Los centros con menos de {MIN_RESPONSIBLES_PER_CENTER} responsables aparecen marcados en naranja.
      </Alert>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        {centers.filter((c) => c.active).map((center) => {
          const count = centerResponsibleCounts[center.id] || 0;
          const valid = count >= MIN_RESPONSIBLES_PER_CENTER && count <= MAX_RESPONSIBLES_PER_CENTER;
          return (
            <Card key={center.id} className="!p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">{center.name}</span>
                <Badge variant={valid ? "success" : "warning"}>
                  {count} responsable{count !== 1 ? "s" : ""}
                </Badge>
              </div>
            </Card>
          );
        })}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2 pr-4">Nombre</th>
                <th className="pb-2 pr-4">Centros asignados</th>
                <th className="pb-2 pr-4">Estado</th>
                <th className="pb-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {responsibles.map((resp) => (
                <tr key={resp.id} className="border-b border-gray-50">
                  <td className="py-3 pr-4 font-medium">{resp.full_name}</td>
                  <td className="py-3 pr-4 text-gray-600">{centerNames(resp.center_ids)}</td>
                  <td className="py-3 pr-4">
                    <Badge variant={resp.active ? "success" : "danger"}>
                      {resp.active ? "Activo" : "Inactivo"}
                    </Badge>
                  </td>
                  <td className="py-3 flex gap-2 flex-wrap">
                    <Link href={`/admin/responsibles/${resp.id}/history`}>
                      <Button variant="ghost" size="sm">Ver historial</Button>
                    </Link>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(resp)}>
                      Asignar centros
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setScheduling(resp)}>
                      Horario
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(resp.id, resp.active)}
                    >
                      {resp.active ? "Desactivar" : "Activar"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={showForm && !editing}
        onClose={() => setShowForm(false)}
        title="Nuevo responsable"
        size="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}
          <Input name="full_name" label="Nombre completo" required />
          <Input name="email" label="Email" type="email" required />
          <Input name="password" label="Contraseña" type="password" required minLength={6} />
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Centros asignados</p>
            <div className="space-y-2">
              {centers.filter((c) => c.active).map((center) => (
                <label key={center.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedCenters.includes(center.id)}
                    onChange={() => toggleCenter(center.id)}
                    className="rounded border-gray-300"
                  />
                  {center.name}
                  <span className="text-gray-400">
                    ({centerResponsibleCounts[center.id] || 0}/{MAX_RESPONSIBLES_PER_CENTER})
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button type="submit" loading={loading}>Crear responsable</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={showForm && !!editing}
        onClose={() => { setShowForm(false); setEditing(null); }}
        title={`Asignar centros — ${editing?.full_name}`}
        onConfirm={handleUpdateAssignments}
        confirmLabel="Guardar asignaciones"
        loading={loading}
        size="lg"
      >
        {error && <Alert variant="error">{error}</Alert>}
        <div className="space-y-2">
          {centers.filter((c) => c.active).map((center) => (
            <label key={center.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedCenters.includes(center.id)}
                onChange={() => toggleCenter(center.id)}
                className="rounded border-gray-300"
              />
              {center.name}
              <span className="text-gray-400">
                ({centerResponsibleCounts[center.id] || 0}/{MAX_RESPONSIBLES_PER_CENTER})
              </span>
            </label>
          ))}
        </div>
      </Modal>

      {scheduling && (
        <ScheduleEditor
          open={!!scheduling}
          onClose={() => setScheduling(null)}
          responsibleId={scheduling.id}
          responsibleName={scheduling.full_name}
          centers={centers}
          centerIds={scheduling.center_ids}
          existingSchedules={allSchedules.filter((s) => s.responsible_id === scheduling.id)}
        />
      )}
    </div>
  );
}
