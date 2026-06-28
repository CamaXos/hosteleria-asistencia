"use server";

import { createClient } from "@/lib/supabase/server";
import type { AttendanceStatus, Center } from "@/lib/types/database";
import { getMonthDays } from "@/lib/utils";

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

export interface TodayOverview {
  dateISO: string;
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
  pendingCenters: { id: string; name: string }[];
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

export async function getDailyOverview(dateISO: string): Promise<TodayOverview> {
  const supabase = await createClient();
  const today = dateISO;

  const [
    { count: activeEmployees },
    { data: activeCenters },
    { data: todayReports },
  ] = await Promise.all([
    supabase.from("employees").select("*", { count: "exact", head: true }).eq("active", true),
    supabase.from("centers").select("*").eq("active", true).order("name"),
    supabase
      .from("attendance_reports")
      .select(`
        *,
        center:centers(*),
        submitter:profiles!attendance_reports_submitted_by_fkey(full_name)
      `)
      .eq("report_date", today)
      .order("submitted_at", { ascending: false }),
  ]);

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

  const pendingCenters = (activeCenters || [])
    .filter((c) => !reportedIds.has(c.id))
    .map((c) => ({ id: c.id, name: c.name }));

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

    const { data: entries } = await supabase
      .from("attendance_entries")
      .select("status, notes, employee_id, report_id, employee:employees(full_name, center_id)")
      .in("report_id", reportIds);

    const reportIdToCenter = new Map(todayReports.map((r) => [r.id, r.center_id]));

    entries?.forEach((e) => {
      const centerId = reportIdToCenter.get(e.report_id) || "";
      const entry: EmployeeTodayEntry = {
        employeeId: e.employee_id,
        employeeName: getEmployeeName(e.employee),
        centerId,
        centerName: centerNameMap.get(centerId) || "—",
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
    });

    attended.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
    notAttended.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  }

  return {
    dateISO: today,
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

  return Array.from(byDate.entries())
    .map(([date, reportCount]) => ({
      date,
      reportCount,
      complete: totalCenters > 0 && reportCount >= totalCenters,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
