"use server";

import { createClient } from "@/lib/supabase/server";
import { getTodayISO } from "@/lib/utils";
import type { AttendanceStatus } from "@/lib/types/database";
import { ATTENDANCE_STATUS_LABELS } from "@/lib/constants";
import { subDays, format } from "date-fns";

export interface TodayStats {
  absencesToday: number;
  sickToday: number;
  workedToday: number;
}

export interface StatusCount {
  status: AttendanceStatus;
  label: string;
  count: number;
}

export interface CenterSubmissionRate {
  centerId: string;
  centerName: string;
  submittedDays: number;
  totalDays: number;
  rate: number;
}

export interface RecentAlert {
  employeeName: string;
  centerName: string;
  status: AttendanceStatus;
  reportDate: string;
  notes: string | null;
}

export interface EmployeeAtRisk {
  employeeId: string;
  employeeName: string;
  centerName: string;
  absenceCount: number;
  sickCount: number;
  total: number;
}

export interface MonthlyTrendPoint {
  date: string;
  worked: number;
  absence: number;
  sick: number;
  day_off: number;
  vacation: number;
  other: number;
}

export interface DailySubmission {
  date: string;
  submitted: number;
  pending: number;
  total: number;
}

function getRelationName(rel: unknown): string {
  if (!rel) return "";
  if (Array.isArray(rel)) return (rel[0] as { name?: string } | undefined)?.name || "";
  return (rel as { name?: string }).name || "";
}

function getEmployeeName(rel: unknown): string {
  if (!rel) return "—";
  if (Array.isArray(rel)) return (rel[0] as { full_name?: string } | undefined)?.full_name || "—";
  return (rel as { full_name?: string }).full_name || "—";
}
function getDateRange(days: number) {
  const end = new Date();
  const start = subDays(end, days - 1);
  return {
    startDate: format(start, "yyyy-MM-dd"),
    endDate: format(end, "yyyy-MM-dd"),
  };
}

export async function getTodayAttendanceStats(): Promise<TodayStats> {
  const supabase = await createClient();
  const today = getTodayISO();

  const { data: reports } = await supabase
    .from("attendance_reports")
    .select("id")
    .eq("report_date", today);

  if (!reports?.length) return { absencesToday: 0, sickToday: 0, workedToday: 0 };

  const reportIds = reports.map((r) => r.id);
  const { data: entries } = await supabase
    .from("attendance_entries")
    .select("status")
    .in("report_id", reportIds);

  let absencesToday = 0;
  let sickToday = 0;
  let workedToday = 0;

  entries?.forEach((e) => {
    if (e.status === "absence") absencesToday++;
    else if (e.status === "sick") sickToday++;
    else if (e.status === "worked") workedToday++;
  });

  return { absencesToday, sickToday, workedToday };
}

export async function getWeeklyAttendanceByStatus(): Promise<StatusCount[]> {
  const supabase = await createClient();
  const { startDate, endDate } = getDateRange(7);

  const { data: reports } = await supabase
    .from("attendance_reports")
    .select("id")
    .gte("report_date", startDate)
    .lte("report_date", endDate);

  if (!reports?.length) {
    return (["worked", "day_off", "vacation", "absence", "sick", "other"] as AttendanceStatus[]).map(
      (status) => ({ status, label: ATTENDANCE_STATUS_LABELS[status], count: 0 })
    );
  }

  const reportIds = reports.map((r) => r.id);
  const { data: entries } = await supabase
    .from("attendance_entries")
    .select("status")
    .in("report_id", reportIds);

  const counts: Record<string, number> = {};
  entries?.forEach((e) => {
    counts[e.status] = (counts[e.status] || 0) + 1;
  });

  const statuses: AttendanceStatus[] = ["worked", "day_off", "vacation", "absence", "sick", "other"];
  return statuses.map((status) => ({
    status,
    label: ATTENDANCE_STATUS_LABELS[status],
    count: counts[status] || 0,
  }));
}

export async function getCenterSubmissionRates(): Promise<CenterSubmissionRate[]> {
  const supabase = await createClient();
  const { startDate, endDate } = getDateRange(7);
  const days = 7;

  const [{ data: centers }, { data: reports }] = await Promise.all([
    supabase.from("centers").select("id, name").eq("active", true).order("name"),
    supabase
      .from("attendance_reports")
      .select("center_id, report_date")
      .gte("report_date", startDate)
      .lte("report_date", endDate),
  ]);

  if (!centers?.length) return [];

  const submissionMap = new Map<string, Set<string>>();
  reports?.forEach((r) => {
    if (!submissionMap.has(r.center_id)) submissionMap.set(r.center_id, new Set());
    submissionMap.get(r.center_id)!.add(r.report_date);
  });

  return centers.map((center) => {
    const submittedDays = submissionMap.get(center.id)?.size || 0;
    return {
      centerId: center.id,
      centerName: center.name,
      submittedDays,
      totalDays: days,
      rate: Math.round((submittedDays / days) * 100),
    };
  });
}

export async function getRecentAbsenceAlerts(limit = 10): Promise<RecentAlert[]> {
  const supabase = await createClient();
  const { startDate } = getDateRange(14);

  const { data: reports } = await supabase
    .from("attendance_reports")
    .select("id, report_date, center:centers(name)")
    .gte("report_date", startDate)
    .order("report_date", { ascending: false });

  if (!reports?.length) return [];

  const reportMap = new Map(
    reports.map((r) => [
      r.id,
      { date: r.report_date, centerName: getRelationName(r.center) },
    ])
  );

  const reportIds = reports.map((r) => r.id);
  const { data: entriesWithReport } = await supabase
    .from("attendance_entries")
    .select("status, notes, report_id, employee:employees(full_name)")
    .in("report_id", reportIds)
    .in("status", ["absence", "sick"])
    .limit(50);

  const alerts: RecentAlert[] = [];
  entriesWithReport?.forEach((e) => {
    const report = reportMap.get(e.report_id);
    if (!report) return;
    alerts.push({
      employeeName: getEmployeeName(e.employee),
      centerName: report.centerName,
      status: e.status as AttendanceStatus,
      reportDate: report.date,
      notes: e.notes,
    });
  });

  alerts.sort((a, b) => b.reportDate.localeCompare(a.reportDate));
  return alerts.slice(0, limit);
}

export async function getEmployeesAtRisk(threshold = 3): Promise<EmployeeAtRisk[]> {
  const supabase = await createClient();
  const { startDate } = getDateRange(30);

  const { data: reports } = await supabase
    .from("attendance_reports")
    .select("id, center:centers(name)")
    .gte("report_date", startDate);

  if (!reports?.length) return [];

  const reportMap = new Map(
    reports.map((r) => [r.id, getRelationName(r.center)])
  );
  const reportIds = reports.map((r) => r.id);

  const { data: entries } = await supabase
    .from("attendance_entries")
    .select("status, report_id, employee_id, employee:employees(full_name)")
    .in("report_id", reportIds)
    .in("status", ["absence", "sick"]);

  const employeeStats = new Map<
    string,
    { name: string; center: string; absence: number; sick: number }
  >();

  entries?.forEach((e) => {
    const center = reportMap.get(e.report_id) || "";
    const existing = employeeStats.get(e.employee_id) || {
      name: getEmployeeName(e.employee),
      center,
      absence: 0,
      sick: 0,
    };
    if (e.status === "absence") existing.absence++;
    else if (e.status === "sick") existing.sick++;
    employeeStats.set(e.employee_id, existing);
  });

  return Array.from(employeeStats.entries())
    .map(([employeeId, stats]) => ({
      employeeId,
      employeeName: stats.name,
      centerName: stats.center,
      absenceCount: stats.absence,
      sickCount: stats.sick,
      total: stats.absence + stats.sick,
    }))
    .filter((e) => e.total >= threshold)
    .sort((a, b) => b.total - a.total);
}

export async function getMonthlyTrends(
  year: number,
  month: number,
  centerId?: string
): Promise<MonthlyTrendPoint[]> {
  const supabase = await createClient();
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const daysInMonth = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

  let reportsQuery = supabase
    .from("attendance_reports")
    .select("id, report_date")
    .gte("report_date", startDate)
    .lte("report_date", endDate);

  if (centerId) reportsQuery = reportsQuery.eq("center_id", centerId);

  const { data: reports } = await reportsQuery;
  if (!reports?.length) return [];

  const reportDateMap = new Map(reports.map((r) => [r.id, r.report_date]));
  const reportIds = reports.map((r) => r.id);

  const { data: entries } = await supabase
    .from("attendance_entries")
    .select("status, report_id")
    .in("report_id", reportIds);

  const dayStats = new Map<string, MonthlyTrendPoint>();

  entries?.forEach((e) => {
    const date = reportDateMap.get(e.report_id);
    if (!date) return;
    if (!dayStats.has(date)) {
      dayStats.set(date, {
        date,
        worked: 0,
        absence: 0,
        sick: 0,
        day_off: 0,
        vacation: 0,
        other: 0,
      });
    }
    const point = dayStats.get(date)!;
    const status = e.status as keyof Omit<MonthlyTrendPoint, "date">;
    if (status in point) point[status]++;
  });

  return Array.from(dayStats.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export async function getDailySubmissions(days = 7): Promise<DailySubmission[]> {
  const supabase = await createClient();
  const { startDate, endDate } = getDateRange(days);

  const [{ count: activeCenterCount }, { data: reports }] = await Promise.all([
    supabase.from("centers").select("*", { count: "exact", head: true }).eq("active", true),
    supabase
      .from("attendance_reports")
      .select("report_date")
      .gte("report_date", startDate)
      .lte("report_date", endDate),
  ]);

  const totalCenters = activeCenterCount || 0;
  const byDate = new Map<string, number>();
  reports?.forEach((r) => {
    byDate.set(r.report_date, (byDate.get(r.report_date) || 0) + 1);
  });

  const result: DailySubmission[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = subDays(new Date(), i);
    const dateStr = format(d, "yyyy-MM-dd");
    const submitted = byDate.get(dateStr) || 0;
    result.push({
      date: dateStr,
      submitted,
      pending: Math.max(0, totalCenters - submitted),
      total: totalCenters,
    });
  }
  return result;
}
