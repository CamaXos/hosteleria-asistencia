"use server";

import { createClient } from "@/lib/supabase/server";
import type { AttendanceStatus, Center } from "@/lib/types/database";
import { getMonthDays, mapSupabaseQueryError } from "@/lib/utils";
import type { PostgrestError } from "@supabase/supabase-js";

function assertSupabaseOk<T>(label: string, result: { data: T; error: PostgrestError | null }): T {
  if (result.error) {
    console.error(`[today] ${label}:`, result.error.message, result.error.code, result.error.details);
    throw new Error(mapSupabaseQueryError(result.error.message, result.error.code));
  }
  return result.data;
}

function assertSupabaseCount(label: string, result: { count: number | null; error: PostgrestError | null }): number {
  if (result.error) {
    console.error(`[today] ${label}:`, result.error.message, result.error.code, result.error.details);
    throw new Error(mapSupabaseQueryError(result.error.message, result.error.code));
  }
  return result.count ?? 0;
}

export interface CenterTodayStatus {
  center: Center;
  submitted: boolean;
  submitterName: string | null;
  submittedAt: string | null;
}

export interface EmployeeTodayEntry {
  employeeId: string;
  employeeName: string;
  centerId: string;
  centerName: string;
  status: AttendanceStatus;
  notes: string | null;
}

export interface TodaySubmission {
  submitterName: string;
  centerName: string;
  submittedAt: string;
}

export interface PendingCenterDetail {
  id: string;
  name: string;
  employeeCount: number;
}

export interface TodayOverview {
  dateISO: string;
  centerId: string | null;
  activeCenters: { id: string; name: string }[];
  kpis: {
    activeEmployees: number;
    workedToday: number;
    absences: number;
    sick: number;
    vacation: number;
    dayOff: number;
    inactive: number;
    other: number;
    pendingCenters: number;
  };
  centers: CenterTodayStatus[];
  attended: EmployeeTodayEntry[];
  notAttended: EmployeeTodayEntry[];
  submissions: TodaySubmission[];
  pendingCenters: PendingCenterDetail[];
}

function getRelationName(rel: unknown): string {
  if (!rel) return "—";
  if (Array.isArray(rel)) return (rel[0] as { name?: string } | undefined)?.name || "—";
  return (rel as { name?: string }).name || "—";
}

function getEmployeeName(rel: unknown): string {
  if (!rel) return "—";
  if (Array.isArray(rel)) return (rel[0] as { full_name?: string } | undefined)?.full_name || "—";
  return (rel as { full_name?: string }).full_name || "—";
}

function getProfileName(rel: unknown): string {
  if (!rel) return "—";
  if (Array.isArray(rel)) return (rel[0] as { full_name?: string } | undefined)?.full_name || "—";
  return (rel as { full_name?: string }).full_name || "—";
}

export async function getDailyOverview(
  dateISO: string,
  centerId?: string | null
): Promise<TodayOverview> {
  const supabase = await createClient();
  const today = dateISO;
  const filterCenterId = centerId || null;

  let activeEmployeesQuery = supabase
    .from("employees")
    .select("*", { count: "exact", head: true })
    .eq("active", true);
  if (filterCenterId) {
    activeEmployeesQuery = activeEmployeesQuery.eq("center_id", filterCenterId);
  }

  let todayReportsQuery = supabase
    .from("attendance_reports")
    .select(`
      *,
      center:centers(*),
      submitter:profiles!attendance_reports_submitted_by_fkey(full_name)
    `)
    .eq("report_date", today)
    .order("submitted_at", { ascending: false });
  if (filterCenterId) {
    todayReportsQuery = todayReportsQuery.eq("center_id", filterCenterId);
  }

  const [
    activeEmployeesResult,
    allActiveCentersResult,
    todayReportsResult,
    employeeCountsResult,
  ] = await Promise.all([
    activeEmployeesQuery,
    supabase.from("centers").select("*").eq("active", true).order("name"),
    todayReportsQuery,
    supabase.from("employees").select("center_id").eq("active", true),
  ]);

  const activeEmployees = assertSupabaseCount("activeEmployees", activeEmployeesResult);
  const allActiveCenters = assertSupabaseOk("centers", allActiveCentersResult);
  const todayReports = assertSupabaseOk("todayReports", todayReportsResult);
  const employeeCounts = assertSupabaseOk("employeeCounts", employeeCountsResult);

  const activeCenters = filterCenterId
    ? (allActiveCenters || []).filter((c) => c.id === filterCenterId)
    : allActiveCenters || [];

  const employeesByCenter = new Map<string, number>();
  for (const emp of employeeCounts || []) {
    employeesByCenter.set(
      emp.center_id,
      (employeesByCenter.get(emp.center_id) || 0) + 1
    );
  }

  const reportMap = new Map(
    todayReports?.map((r) => [r.center_id, r]) || []
  );
  const reportedIds = new Set(todayReports?.map((r) => r.center_id) || []);

  const centers: CenterTodayStatus[] = (activeCenters || []).map((center) => {
    const report = reportMap.get(center.id);
    return {
      center,
      submitted: !!report,
      submitterName: report ? getProfileName(report.submitter) : null,
      submittedAt: report?.submitted_at || null,
    };
  });

  const pendingCenters: PendingCenterDetail[] = (activeCenters || [])
    .filter((c) => !reportedIds.has(c.id))
    .map((c) => ({
      id: c.id,
      name: c.name,
      employeeCount: employeesByCenter.get(c.id) || 0,
    }));

  const submissions: TodaySubmission[] = (todayReports || []).map((r) => ({
    submitterName: getProfileName(r.submitter),
    centerName: getRelationName(r.center),
    submittedAt: r.submitted_at,
  }));

  const kpis = {
    activeEmployees: activeEmployees || 0,
    workedToday: 0,
    absences: 0,
    sick: 0,
    vacation: 0,
    dayOff: 0,
    inactive: 0,
    other: 0,
    pendingCenters: pendingCenters.length,
  };

  const attended: EmployeeTodayEntry[] = [];
  const notAttended: EmployeeTodayEntry[] = [];

  if (todayReports?.length) {
    const reportIds = todayReports.map((r) => r.id);
    const centerNameMap = new Map(
      todayReports.map((r) => [r.center_id, getRelationName(r.center)])
    );

    const entriesResult = await supabase
      .from("attendance_entries")
      .select("status, notes, employee_id, report_id, employee:employees(full_name, center_id)")
      .in("report_id", reportIds);

    const entries = assertSupabaseOk("attendance_entries", entriesResult) ?? [];

    const reportIdToCenter = new Map(todayReports.map((r) => [r.id, r.center_id]));

    for (const e of entries) {
      const entryCenterId = reportIdToCenter.get(e.report_id) || "";
      const entry: EmployeeTodayEntry = {
        employeeId: e.employee_id,
        employeeName: getEmployeeName(e.employee),
        centerId: entryCenterId,
        centerName: centerNameMap.get(entryCenterId) || "—",
        status: e.status as AttendanceStatus,
        notes: e.notes,
      };

      if (e.status === "worked") {
        kpis.workedToday++;
        attended.push(entry);
      } else {
        if (e.status === "absence") kpis.absences++;
        else if (e.status === "sick") kpis.sick++;
        else if (e.status === "vacation") kpis.vacation++;
        else if (e.status === "day_off") kpis.dayOff++;
        else if (e.status === "inactive") kpis.inactive++;
        else kpis.other++;
        notAttended.push(entry);
      }
    }

    attended.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
    notAttended.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  }

  return {
    dateISO: today,
    centerId: filterCenterId,
    activeCenters: (allActiveCenters || []).map((c) => ({ id: c.id, name: c.name })),
    kpis,
    centers,
    attended,
    notAttended,
    submissions,
    pendingCenters,
  };
}

export interface MonthReportDay {
  date: string;
  reportCount: number;
  complete: boolean;
}

export async function getMonthReportDays(
  year: number,
  month: number
): Promise<MonthReportDay[]> {
  const supabase = await createClient();
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(getMonthDays(year, month)).padStart(2, "0")}`;

  const [{ count: activeCenterCount, error: centerCountError }, reportsResult] = await Promise.all([
    supabase.from("centers").select("*", { count: "exact", head: true }).eq("active", true),
    supabase
      .from("attendance_reports")
      .select("report_date")
      .gte("report_date", startDate)
      .lte("report_date", endDate),
  ]);

  if (centerCountError) {
    console.error("[today] monthCenterCount:", centerCountError.message, centerCountError.code);
    throw new Error(mapSupabaseQueryError(centerCountError.message, centerCountError.code));
  }

  const reports = assertSupabaseOk("monthReports", reportsResult);

  const totalCenters = activeCenterCount || 0;
  const byDate = new Map<string, number>();
  reports?.forEach((r) => {
    byDate.set(r.report_date, (byDate.get(r.report_date) || 0) + 1);
  });

  return Array.from(byDate.entries())
    .map(([date, reportCount]) => ({
      date,
      reportCount,
      complete: totalCenters > 0 && reportCount >= totalCenters,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
