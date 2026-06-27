"use client";

import { useState } from "react";
import { saveResponsibleSchedules, type ScheduleInput } from "@/lib/actions/responsible-stats";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Alert";
import { getErrorMessage } from "@/lib/utils";
import { DAY_OF_WEEK_LABELS } from "@/lib/constants";
import type { Center, ResponsibleSchedule } from "@/lib/types/database";

interface ScheduleEditorProps {
  open: boolean;
  onClose: () => void;
  responsibleId: string;
  responsibleName: string;
  centers: Center[];
  centerIds: string[];
  existingSchedules: ResponsibleSchedule[];
}

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];

function validateLocalSchedules(schedules: ScheduleInput[]): string | null {
  for (const s of schedules) {
    if (!s.startTime || !s.endTime) {
      return `Completa hora inicio y fin para ${DAY_OF_WEEK_LABELS[s.dayOfWeek]}`;
    }
    if (s.startTime >= s.endTime) {
      return `La hora fin debe ser posterior a la hora inicio (${DAY_OF_WEEK_LABELS[s.dayOfWeek]})`;
    }
  }
  return null;
}

export function ScheduleEditor({
  open,
  onClose,
  responsibleId,
  responsibleName,
  centers,
  centerIds,
  existingSchedules,
}: ScheduleEditorProps) {
  const assignedCenters = centers.filter((c) => centerIds.includes(c.id));

  const [schedules, setSchedules] = useState<ScheduleInput[]>(() =>
    existingSchedules.map((s) => ({
      centerId: s.center_id,
      dayOfWeek: s.day_of_week,
      startTime: s.start_time.slice(0, 5),
      endTime: s.end_time.slice(0, 5),
    }))
  );
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function getSchedule(centerId: string, day: number): ScheduleInput | undefined {
    return schedules.find((s) => s.centerId === centerId && s.dayOfWeek === day);
  }

  function updateSchedule(
    centerId: string,
    day: number,
    field: "startTime" | "endTime",
    value: string
  ) {
    setSuccess(false);
    setSchedules((prev) => {
      const existing = prev.find((s) => s.centerId === centerId && s.dayOfWeek === day);
      if (existing) {
        return prev.map((s) =>
          s.centerId === centerId && s.dayOfWeek === day ? { ...s, [field]: value } : s
        );
      }
      const newEntry: ScheduleInput = {
        centerId,
        dayOfWeek: day,
        startTime: field === "startTime" ? value : "09:00",
        endTime: field === "endTime" ? value : "17:00",
      };
      newEntry[field] = value;
      return [...prev, newEntry];
    });
  }

  function toggleDay(centerId: string, day: number, enabled: boolean) {
    setSuccess(false);
    if (enabled) {
      setSchedules((prev) => [
        ...prev,
        { centerId, dayOfWeek: day, startTime: "09:00", endTime: "17:00" },
      ]);
    } else {
      setSchedules((prev) =>
        prev.filter((s) => !(s.centerId === centerId && s.dayOfWeek === day))
      );
    }
  }

  async function handleSave() {
    setError("");
    setSuccess(false);

    const validationError = validateLocalSchedules(schedules);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      await saveResponsibleSchedules(responsibleId, schedules, centerIds);
      setSuccess(true);
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 1200);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Horario — ${responsibleName}`}
      size="lg"
      onConfirm={handleSave}
      confirmLabel="Guardar horario"
      loading={loading}
    >
      {error && <Alert variant="error">{error}</Alert>}
      {success && (
        <Alert variant="success">Horario guardado correctamente</Alert>
      )}

      {assignedCenters.length === 0 ? (
        <p className="text-sm text-slate-500">Asigna centros primero para configurar horarios.</p>
      ) : (
        <div className="space-y-6 max-h-[60vh] overflow-y-auto">
          {assignedCenters.map((center) => (
            <div key={center.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <h4 className="mb-4 font-semibold text-[var(--primary)]">{center.name}</h4>
              <div className="space-y-3">
                {WEEKDAYS.map((day) => {
                  const sched = getSchedule(center.id, day);
                  const enabled = !!sched;
                  return (
                    <div
                      key={day}
                      className={`rounded-xl border p-3 transition-colors ${
                        enabled
                          ? "border-[var(--accent)]/30 bg-white"
                          : "border-slate-100 bg-white/60"
                      }`}
                    >
                      <label className="flex cursor-pointer items-center gap-3">
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={(e) => toggleDay(center.id, day, e.target.checked)}
                          className="h-5 w-5 rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]"
                        />
                        <span className="min-w-[5rem] text-sm font-medium text-slate-900">
                          {DAY_OF_WEEK_LABELS[day]}
                        </span>
                      </label>
                      {enabled && sched && (
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <Input
                            label="Hora inicio"
                            type="time"
                            value={sched.startTime}
                            onChange={(e) =>
                              updateSchedule(center.id, day, "startTime", e.target.value)
                            }
                          />
                          <Input
                            label="Hora fin"
                            type="time"
                            value={sched.endTime}
                            onChange={(e) =>
                              updateSchedule(center.id, day, "endTime", e.target.value)
                            }
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
