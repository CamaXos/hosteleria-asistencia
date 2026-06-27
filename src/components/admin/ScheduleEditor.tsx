"use client";

import { useState } from "react";
import { saveResponsibleSchedules, type ScheduleInput } from "@/lib/actions/responsible-stats";
import { Button } from "@/components/ui/Button";
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
    setLoading(true);
    const valid = schedules.filter((s) => s.startTime && s.endTime);
    try {
      await saveResponsibleSchedules(responsibleId, valid);
      onClose();
      window.location.reload();
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

      {assignedCenters.length === 0 ? (
        <p className="text-sm text-slate-500">Asigna centros primero para configurar horarios.</p>
      ) : (
        <div className="space-y-6 max-h-[60vh] overflow-y-auto">
          {assignedCenters.map((center) => (
            <div key={center.id} className="rounded-xl border border-slate-200 p-4">
              <h4 className="mb-3 font-medium text-slate-900">{center.name}</h4>
              <div className="space-y-3">
                {WEEKDAYS.map((day) => {
                  const sched = getSchedule(center.id, day);
                  const enabled = !!sched;
                  return (
                    <div key={day} className="flex flex-wrap items-center gap-3">
                      <label className="flex w-28 items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={(e) => toggleDay(center.id, day, e.target.checked)}
                          className="rounded border-slate-300"
                        />
                        {DAY_OF_WEEK_LABELS[day]}
                      </label>
                      {enabled && sched && (
                        <div className="flex items-center gap-2">
                          <Input
                            type="time"
                            value={sched.startTime}
                            onChange={(e) =>
                              updateSchedule(center.id, day, "startTime", e.target.value)
                            }
                            className="!py-1.5"
                          />
                          <span className="text-slate-400">–</span>
                          <Input
                            type="time"
                            value={sched.endTime}
                            onChange={(e) =>
                              updateSchedule(center.id, day, "endTime", e.target.value)
                            }
                            className="!py-1.5"
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
