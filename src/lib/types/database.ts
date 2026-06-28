export type UserRole = "admin" | "responsible";

export type AttendanceStatus =
  | "worked"
  | "day_off"
  | "vacation"
  | "absence"
  | "sick"
  | "inactive"
  | "other";

export type ReportStatus = "submitted";

export type EmployeeAction =
  | "created"
  | "activated"
  | "deactivated"
  | "updated";

export interface Profile {
  id: string;
  full_name: string;
  username: string | null;
  role: UserRole;
  active: boolean;
  created_at: string;
  deactivated_at: string | null;
}

export interface Center {
  id: string;
  name: string;
  address: string | null;
  active: boolean;
  created_at: string;
}

export interface ResponsibleCenter {
  id: string;
  responsible_id: string;
  center_id: string;
  created_at: string;
  centers?: Center;
  profiles?: Profile;
}

export interface ResponsibleSchedule {
  id: string;
  responsible_id: string;
  center_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  created_at: string;
  centers?: Center;
}

export interface Employee {
  id: string;
  center_id: string;
  full_name: string;
  dni_nie: string | null;
  phone: string | null;
  position: string | null;
  start_date: string;
  end_date: string | null;
  active: boolean;
  created_by: string | null;
  created_at: string;
  centers?: Center;
}

export interface AttendanceReport {
  id: string;
  center_id: string;
  report_date: string;
  submitted_by: string;
  submitted_at: string;
  status: ReportStatus;
  notes: string | null;
  created_at: string;
  centers?: Center;
  profiles?: Profile;
}

export interface AttendanceEntry {
  id: string;
  report_id: string;
  employee_id: string;
  status: AttendanceStatus;
  notes: string | null;
  created_at: string;
  employees?: Employee;
}

export interface EmployeeStatusLog {
  id: string;
  employee_id: string;
  action: EmployeeAction;
  performed_by: string;
  notes: string | null;
  created_at: string;
}

export interface AttendanceAuditLog {
  id: string;
  table_name: string;
  record_id: string;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string;
  created_at: string;
}

export interface AttendanceEntryInput {
  employee_id: string;
  status: AttendanceStatus;
  notes?: string | null;
}

export interface MonthlyGridRow {
  employee: Employee;
  days: Record<number, AttendanceStatus | null>;
  totals: Record<AttendanceStatus, number>;
}

export type MonthlyAttendanceRow = MonthlyGridRow;

export interface ReportWithDetails extends AttendanceReport {
  center?: Center;
  submitter?: Profile;
  entries?: (AttendanceEntry & { employee?: Employee })[];
}

export interface DashboardSummary {
  totalCenters: number;
  activeCenters: number;
  totalEmployees: number;
  activeEmployees: number;
  todayReports: number;
  pendingCenters: number;
}
