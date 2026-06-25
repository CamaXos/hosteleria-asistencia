"use client";

import { useState } from "react";
import { createCenter, updateCenter } from "@/lib/actions/centers";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { getErrorMessage } from "@/lib/utils";
import type { Center } from "@/lib/types/database";

interface CentersManagerProps {
  centers: Center[];
}

export function CentersManager({ centers }: CentersManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Center | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const formData = new FormData(e.currentTarget);

    try {
      if (editing) {
        await updateCenter(editing.id, formData);
      } else {
        await createCenter(formData);
      }
      setShowForm(false);
      setEditing(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function openEdit(center: Center) {
    setEditing(center);
    setShowForm(true);
  }

  function openCreate() {
    setEditing(null);
    setShowForm(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Centros</h1>
          <p className="text-sm text-gray-500">Gestiona los centros de trabajo</p>
        </div>
        <Button onClick={openCreate}>Nuevo centro</Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2 pr-4">Nombre</th>
                <th className="pb-2 pr-4">Dirección</th>
                <th className="pb-2 pr-4">Estado</th>
                <th className="pb-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {centers.map((center) => (
                <tr key={center.id} className="border-b border-gray-50">
                  <td className="py-3 pr-4 font-medium">{center.name}</td>
                  <td className="py-3 pr-4 text-gray-600">{center.address || "—"}</td>
                  <td className="py-3 pr-4">
                    <Badge variant={center.active ? "success" : "danger"}>
                      {center.active ? "Activo" : "Inactivo"}
                    </Badge>
                  </td>
                  <td className="py-3">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(center)}>
                      Editar
                    </Button>
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
        title={editing ? "Editar centro" : "Nuevo centro"}
        hideFooter
      >
        <form id="center-form" onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}
          <Input
            name="name"
            label="Nombre"
            defaultValue={editing?.name}
            required
          />
          <Input
            name="address"
            label="Dirección"
            defaultValue={editing?.address || ""}
          />
          {editing && (
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Estado</label>
              <select
                name="active"
                defaultValue={editing.active ? "true" : "false"}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </select>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              {editing ? "Guardar" : "Crear"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
