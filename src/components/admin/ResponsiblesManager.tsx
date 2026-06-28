"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  createResponsibleWithUsername,
  resetResponsiblePassword,
  updateResponsibleAssignments,
  deactivateResponsible,
  reactivateResponsible,
} from "@/lib/actions/employees";
import { ScheduleEditor } from "@/components/admin/ScheduleEditor";
import { CredentialsCard } from "@/components/admin/CredentialsCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { getErrorMessage, formatDate } from "@/lib/utils";
import { MIN_RESPONSIBLES_PER_CENTER, MAX_RESPONSIBLES_PER_CENTER } from "@/lib/constants";
import type { Center, Profile, ResponsibleSchedule } from "@/lib/types/database";
import type { ResponsibleCredentials } from "@/lib/auth/responsible-auth";

type ResponsibleWithCenters = Profile & { center_ids: string[] };

interface ResponsiblesManagerProps {
  activeResponsibles: ResponsibleWithCenters[];
  inactiveResponsibles: ResponsibleWithCenters[];
  centers: Center[];
  centerResponsibleCounts: Record<string, number>;
  allSchedules: ResponsibleSchedule[];
}

export function ResponsiblesManager({
  activeResponsibles,
  inactiveResponsibles,
  centers,
  centerResponsibleCounts,
  allSchedules,
}: ResponsiblesManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ResponsibleWithCenters | null>(null);
  const [scheduling, setScheduling] = useState<ResponsibleWithCenters | null>(null);
  const [deactivating, setDeactivating] = useState<ResponsibleWithCenters | null>(null);
  const [reactivating, setReactivating] = useState<ResponsibleWithCenters | null>(null);
  const [inactiveOpen, setInactiveOpen] = useState(inactiveResponsibles.length > 0);
  const [selectedCenters, setSelectedCenters] = useState<string[]>([]);
  const [credentials, setCredentials] = useState<
    (ResponsibleCredentials & { fullName?: string }) | null
  >(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (inactiveResponsibles.length > 0) {
      setInactiveOpen(true);
    }
  }, [inactiveResponsibles.length]);

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

  async function handleDeactivate() {
    if (!deactivating) return;
    setLoading(true);
    try {
      await deactivateResponsible(deactivating.id);
      setDeactivating(null);
      window.location.reload();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleReactivate() {
    if (!reactivating) return;
    setLoading(true);
    try {
      await reactivateResponsible(reactivating.id);
      setReactivating(null);
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
          <h1 className="text-2xl font-bold text-slate-900">Responsables</h1>
          <p className="text-sm text-slate-500">
            Cada centro debe tener entre {MIN_RESPONSIBLES_PER_CENTER} y {MAX_RESPONSIBLES_PER_CENTER} responsables activos
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
                <span className="font-medium text-slate-900">{center.name}</span>
                <Badge variant={valid ? "success" : "warning"}>
                  {count} responsable{count !== 1 ? "s" : ""}
                </Badge>
              </div>
            </Card>
          );
        })}
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-[var(--primary)]">Responsables activos</h2>
          <Badge variant="success">{activeResponsibles.length}</Badge>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="pb-2 pr-4">Nombre</th>
                  <th className="pb-2 pr-4">Usuario</th>
                  <th className="pb-2 pr-4">Centros asignados</th>
                  <th className="pb-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {activeResponsibles.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      No hay responsables activos
                    </td>
                  </tr>
                ) : (
                  activeResponsibles.map((resp) => (
                    <tr key={resp.id} className="border-b border-slate-50">
                      <td className="py-3 pr-4 font-medium text-slate-900">{resp.full_name}</td>
                      <td className="py-3 pr-4 font-mono text-slate-600">
                        {resp.username || "—"}
                      </td>
                      <td className="py-3 pr-4 text-slate-600">{centerNames(resp.center_ids)}</td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
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
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => setDeactivating(resp)}
                          >
                            Desactivar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <section className="space-y-3">
        <button
          type="button"
          onClick={() => setInactiveOpen((open) => !open)}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-left sm:pointer-events-none sm:cursor-default sm:border-0 sm:bg-transparent sm:px-0 sm:py-0"
        >
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-500">Desactivados</h2>
            <Badge variant="default">Desactivados ({inactiveResponsibles.length})</Badge>
          </div>
          <span className="text-slate-400 sm:hidden">
            {inactiveOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </span>
        </button>

        {inactiveOpen && (
          <Card className="border-slate-200 bg-slate-50/80">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-400">
                    <th className="pb-2 pr-4">Nombre</th>
                    <th className="pb-2 pr-4">Usuario</th>
                    <th className="pb-2 pr-4">Centros asignados</th>
                    <th className="pb-2 pr-4">Fecha de baja</th>
                    <th className="pb-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {inactiveResponsibles.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        No hay responsables desactivados
                      </td>
                    </tr>
                  ) : (
                    inactiveResponsibles.map((resp) => (
                      <tr key={resp.id} className="border-b border-slate-100 text-slate-500">
                        <td className="py-3 pr-4 font-medium">{resp.full_name}</td>
                        <td className="py-3 pr-4 font-mono">{resp.username || "—"}</td>
                        <td className="py-3 pr-4 text-slate-400">{centerNames(resp.center_ids)}</td>
                        <td className="py-3 pr-4 text-slate-400">
                          {resp.deactivated_at ? formatDate(resp.deactivated_at) : "—"}
                        </td>
                        <td className="py-3">
                          <Button
                            variant="accent"
                            size="sm"
                            onClick={() => setReactivating(resp)}
                            disabled={loading}
                          >
                            Reactivar
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </section>

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

      <Modal
        open={!!deactivating}
        onClose={() => setDeactivating(null)}
        title="Desactivar responsable"
        onConfirm={handleDeactivate}
        confirmLabel="Desactivar"
        variant="danger"
        loading={loading}
      >
        <p className="text-sm text-slate-600">
          ¿Desactivar a <strong>{deactivating?.full_name}</strong>? Dejará de poder iniciar sesión
          y pasará a la sección de desactivados. Sus centros asignados se conservan para una posible reactivación.
        </p>
      </Modal>

      <Modal
        open={!!reactivating}
        onClose={() => setReactivating(null)}
        title="Reactivar responsable"
        onConfirm={handleReactivate}
        confirmLabel="Reactivar"
        loading={loading}
      >
        <p className="text-sm text-slate-600">
          ¿Reactivar a <strong>{reactivating?.full_name}</strong>? Volverá a poder iniciar sesión
          con su usuario y contraseña actuales.
        </p>
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
