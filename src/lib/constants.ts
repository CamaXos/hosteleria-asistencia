import type { AttendanceStatus } from "@/lib/types/database";

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  worked: "Trabajado",
  day_off: "Libre",
  vacation: "Vacaciones",
  absence: "Falta",
  sick: "Enfermedad",
  inactive: "Baja",
  other: "Otro",
};

export const ATTENDANCE_STATUS_CODES: Record<AttendanceStatus, string> = {
  worked: "T",
  day_off: "L",
  vacation: "V",
  absence: "F",
  sick: "E",
  inactive: "B",
  other: "O",
};

export const ATTENDANCE_STATUS_COLORS: Record<AttendanceStatus, string> = {
  worked: "bg-green-100 text-green-800 border-green-300",
  day_off: "bg-blue-100 text-blue-800 border-blue-300",
  vacation: "bg-purple-100 text-purple-800 border-purple-300",
  absence: "bg-red-100 text-red-800 border-red-300",
  sick: "bg-orange-100 text-orange-800 border-orange-300",
  inactive: "bg-gray-100 text-gray-600 border-gray-300",
  other: "bg-yellow-100 text-yellow-800 border-yellow-300",
};

export const ALL_ATTENDANCE_STATUSES: AttendanceStatus[] = [
  "worked",
  "day_off",
  "vacation",
  "absence",
  "sick",
  "inactive",
  "other",
];

export const MIN_RESPONSIBLES_PER_CENTER = 2;
export const MAX_RESPONSIBLES_PER_CENTER = 4;

export const ROLE_LABELS = {
  admin: "Administrador",
  responsible: "Responsable",
} as const;
