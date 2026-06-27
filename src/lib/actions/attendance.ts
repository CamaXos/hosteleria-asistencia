"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type {
  AttendanceEntryInput,
  AttendanceReport,
  AttendanceStatus,
  Center,
  DashboardSummary,
  MonthlyAttendanceRow,
  ReportWithDetails,
} from "@/lib/types/database";
import { emptyTotals, getMonthDays, getTodayISO, mapAttendanceSubmitError } from "@/lib/utils";

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const supabase = await createClient();
  const today = getTodayISO();

  const [{ count: totalCenters }, { count: activeCenters }, { count: totalEmployees }, { count: activeEmployees }, { data: todayReports }] =
    await Promise.all([
      supabase.from("centers").select("*", { count: "exact", head: true }),
      supabase.from("centers").select("*", { count: "exact", head: true }).eq("active", true),
      supabase.from("employees").select("*", { count: "exact", head: true }),
      supabase.from("employees").select("*", { count: "exact", head: true }).eq("active", true),
      supabase.from("attendance_reports").select("center_id").eq("report_date", today),
    ]);

  const reportedCenterIds = new Set(todayReports?.map((r) => r.center_id) || []);

  const { data: activeCenterList } = await supabase
    .from("centers")
    .select("id")
    .eq("active", true);

  const pendingCenters =
    activeCenterList?.filter((c) => !reportedCenterIds.has(c.id)).length || 0;

  return {
    totalCenters: totalCenters || 0,
    activeCenters: activeCenters || 0,
    totalEmployees: totalEmployees || 0,
    activeEmployees: activeEmployees || 0,
    todayReports: todayReports?.length || 0,
    pendingCenters,
  };
}

export async function getTodayReports(): Promise<ReportWithDetails[]> {
  const supabase = await createClient();
  const today = getTodayISO();

  const { data } = await supabase
    .from("attendance_reports")
    .select(`
      *,
      center:centers(*),
      submitter:profiles!attendance_reports_submitted_by_fkey(*)
    `)
    .eq("report_date", today)
    .order("submitted_at", { ascending: false });

  return (data as ReportWithDetails[]) || [];
}

export async function getAssignedCenters(): Promise<Center[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: assignments } = await supabase
    .from("responsible_centers")
    .select("center_id, centers(*)")
    .eq("responsible_id", user.id);

  return (
    assignments
      ?.map((a) => a.centers as unknown as Center)
      .filter((c) => c && c.active) || []
  );
}

export async function checkTodayReport(centerId: string): Promise<AttendanceReport | null> {
  const supabase = await createClient();
  const today = getTodayISO();

  const { data } = await supabase
    .from("attendance_reports")
    .select("*")
    .eq("center_id", centerId)
    .eq("report_date", today)
    .maybeSingle();

  return data;
}

export async function getActiveEmployeesForCenter(centerId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("employees")
    .select("*")
    .eq("center_id", centerId)
    .eq("active", true)
    .order("full_name");

  return data || [];
}

export async function submitAttendanceReport(
  centerId: string,
  entries: AttendanceEntryInput[],
  notes?: string
): Promise<string> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("submit_attendance_report", {
    p_center_id: centerId,
    p_notes: notes || null,
    p_entries: entries,
  });

  if (error) {
    throw new Error(mapAttendanceSubmitError(error.message));
  }

  if (!data) {
    throw new Error("No se pudo enviar el informe. Inténtalo de nuevo.");
  }

  revalidatePath("/responsible");
  revalidatePath("/admin");
  revalidatePath("/admin/resumen-diario");
  revalidatePath("/responsible/stats");
  return data as string;
}

export async function getMonthlyAttendance(
  centerId: string,
  year: number,
  month: number,
  employeeFilter?: string,
  statusFilter?: AttendanceStatus
): Promise<MonthlyAttendanceRow[]> {
  const supabase = await createClient();
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const daysInMonth = getMonthDays(year, month);
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

  let employeesQuery = supabase
    .from("employees")
    .select("*")
    .eq("center_id", centerId)
    .order("full_name");

  if (employeeFilter) {
    employeesQuery = employeesQuery.eq("id", employeeFilter);
  }

  const { data: employees } = await employeesQuery;
  if (!employees?.length) return [];

  const { data: reports } = await supabase
    .from("attendance_reports")
    .select("id, report_date")
    .eq("center_id", centerId)
    .gte("report_date", startDate)
    .lte("report_date", endDate);

  if (!reports?.length) {
    return employees.map((emp) => ({
      employee: emp,
      days: {},
      totals: emptyTotals(),
    }));
  }

  const reportIds = reports.map((r) => r.id);
  const reportDateMap = new Map(reports.map((r) => [r.id, r.report_date]));

  const { data: entries } = await supabase
    .from("attendance_entries")
    .select("*")
    .in("report_id", reportIds);

  const rows: MonthlyAttendanceRow[] = employees.map((emp) => {
    const days: Record<number, AttendanceStatus | null> = {};
    const totals = emptyTotals();

    for (let d = 1; d <= daysInMonth; d++) {
      days[d] = null;
    }

    entries
      ?.filter((e) => e.employee_id === emp.id)
      .forEach((entry) => {
        const reportDate = reportDateMap.get(entry.report_id);
        if (reportDate) {
          const day = parseInt(reportDate.split("-")[2], 10);
          days[day] = entry.status;
          totals[entry.status as AttendanceStatus]++;
        }
      });

    return { employee: emp, days, totals };
  });

  if (statusFilter) {
    return rows.filter((row) => row.totals[statusFilter] > 0);
  }

  return rows;
}

export async function adminCorrectEntry(
  entryId: string,
  newStatus: AttendanceStatus,
  reason: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: entry } = await supabase
    .from("attendance_entries")
    .select("*")
    .eq("id", entryId)
    .single();

  if (!entry) throw new Error("Entrada no encontrada");

  await supabase.from("attendance_audit_logs").insert({
    table_name: "attendance_entries",
    record_id: entryId,
    field_changed: "status",
    old_value: entry.status,
    new_value: newStatus,
    changed_by: user.id,
  });

  const { error } = await supabase
    .from("attendance_entries")
    .update({ status: newStatus, notes: reason })
    .eq("id", entryId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/monthly");
}

export async function getReportsForMonth(
  year: number,
  month: number,
  centerId?: string
): Promise<ReportWithDetails[]> {
  const supabase = await createClient();
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const daysInMonth = getMonthDays(year, month);
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

  let query = supabase
    .from("attendance_reports")
    .select(`
      *,
      center:centers(*),
      submitter:profiles!attendance_reports_submitted_by_fkey(*),
      entries:attendance_entries(*, employee:employees(*))
    `)
    .gte("report_date", startDate)
    .lte("report_date", endDate)
    .order("report_date");

  if (centerId) {
    query = query.eq("center_id", centerId);
  }

  const { data } = await query;
  return (data as ReportWithDetails[]) || [];
}
