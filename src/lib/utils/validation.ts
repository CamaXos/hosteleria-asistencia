import { MIN_RESPONSIBLES_PER_CENTER, MAX_RESPONSIBLES_PER_CENTER } from "@/lib/constants";

export function validateResponsibleCount(count: number): string | null {
  if (count < MIN_RESPONSIBLES_PER_CENTER) {
    return `Cada centro debe tener al menos ${MIN_RESPONSIBLES_PER_CENTER} responsables asignados.`;
  }
  if (count > MAX_RESPONSIBLES_PER_CENTER) {
    return `Cada centro puede tener como máximo ${MAX_RESPONSIBLES_PER_CENTER} responsables.`;
  }
  return null;
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
