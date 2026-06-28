"use client";

import { useState } from "react";
import Link from "next/link";
import {
  createResponsibleWithUsername,
  resetResponsiblePassword,
  updateResponsibleAssignments,
  toggleResponsibleActive,
} from "@/lib/actions/employees";
import { ScheduleEditor } from "@/components/admin/ScheduleEditor";
import { CredentialsCard } from "@/components/admin/CredentialsCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { getErrorMessage } from "@/lib/utils";
import { MIN_RESPONSIBLES_PER_CENTER, MAX_RESPONSIBLES_PER_CENTER } from "@/lib/constants";
import type { Center, Profile, ResponsibleSchedule } from "@/lib/types/database";
import type { ResponsibleCredentials } from "@/lib/auth/responsible-auth";

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
  const [credentials, setCredentials] = useState<
    (ResponsibleCredentials & { fullName?: string }) | null
  >(null);
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
    setError("");
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

    const form = e.currentTarget;
    const fullName = (form.elements.namedItem("full_name") as HTMLInputElement).value;
    const username = (form.elements.namedItem("username") as HTMLInputElement).value;

    try {
      const result = await createResponsibleWithUsername(
        username,
        fullName,
        selectedCenters
      );
      setShowForm(false);
      setCredentials({ ...result, fullName: fullName.trim() });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(resp: ResponsibleWithCenters) {
    if (!resp.username) {
      setError("Este responsable no tiene usuario configurado");
      return;
    }

    if (!confirm(`¿Resetear la contraseña de ${resp.full_name}?`)) return;

    setError("");
    setLoading(true);
    try {
      const result = await resetResponsiblePassword(resp.id);
      setCredentials({ ...result, fullName: resp.full_name });
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

  function handleCredentialsClose() {
    setCredentials(null);
    window.location.reload();
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
        Cree cada responsable con un usuario único; el sistema generará la contraseña automáticamente.
      </Alert>

      {error && !showForm && <Alert variant="error">{error}</Alert>}

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
                <th className="pb-2 pr-4">Usuario</th>
                <th className="pb-2 pr-4">Centros asignados</th>
                <th className="pb-2 pr-4">Estado</th>
                <th className="pb-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {responsibles.map((resp) => (
                <tr key={resp.id} className="border-b border-gray-50">
                  <td className="py-3 pr-4 font-medium">{resp.full_name}</td>
                  <td className="py-3 pr-4 font-mono text-gray-600">
                    {resp.username || "—"}
                  </td>
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
                    {resp.username && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResetPassword(resp)}
                        disabled={loading}
                      >
                        Resetear contraseña
                      </Button>
                    )}
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
          <div>
            <Input
              name="username"
              label="Usuario"
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              title="Solo letras minúsculas, números y guiones"
              placeholder="resp-la-plaza-01"
              autoComplete="off"
            />
            <p className="mt-1 text-xs text-gray-500">
              Identificador único para iniciar sesión (sin email real). Ejemplo: resp-la-plaza-01
            </p>
          </div>
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

      {credentials && (
        <CredentialsCard
          open={!!credentials}
          username={credentials.username}
          password={credentials.password}
          fullName={credentials.fullName}
          onClose={handleCredentialsClose}
        />
      )}
    </div>
  );
}
