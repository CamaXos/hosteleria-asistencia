import type { AttendanceStatus } from "@/lib/types/database";
import {
  ATTENDANCE_STATUS_CODES,
  ATTENDANCE_STATUS_COLORS,
  ATTENDANCE_STATUS_LABELS,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: AttendanceStatus;
  showLabel?: boolean;
}

export function StatusBadge({ status, showLabel = false }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold",
        ATTENDANCE_STATUS_COLORS[status]
      )}
      title={ATTENDANCE_STATUS_LABELS[status]}
    >
      {ATTENDANCE_STATUS_CODES[status]}
      {showLabel && ` - ${ATTENDANCE_STATUS_LABELS[status]}`}
    </span>
  );
}
