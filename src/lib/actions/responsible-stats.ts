"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { subDays, format } from "date-fns";
import type { AttendanceStatus, Center, ResponsibleSchedule } from "@/lib/types/database";

export interface ResponsibleSubmission {
  id: string;
  reportDate: string;
  submittedAt: string;
  centerName: string;
  centerId: string;
  entryCount: number;
}

export interface ScheduleEntry {
  centerId: string;
  centerName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface ResponsibleStatsData {
  submissions: ResponsibleSubmission[];
  schedules: ScheduleEntry[];
  assignedCenters: Center[];
}

export interface ScheduleInput {
  centerId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

function getRelationName(rel: unknown): string {
  if (!rel) return "—";
  if (Array.isArray(rel)) return (rel[0] as { name?: string } | undefined)?.name || "—";
  return (rel as { name?: string }).name || "—";
}

export async function getResponsibleStats(): Promise<ResponsibleStatsData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { submissions: [], schedules: [], assignedCenters: [] };
  }

  const startDate = format(subDays(new Date(), 30), "yyyy-MM-dd");

  const [{ data: assignments }, { data: reports }, { data: scheduleRows }] = await Promise.all([
    supabase
      .from("responsible_centers")
      .select("center_id, centers(*)")
      .eq("responsible_id", user.id),
    supabase
      .from("attendance_reports")
      .select(`
        id,
        center_id,
        report_date,
        submitted_at,
        center:centers(name),
        entries:attendance_entries(count)
      `)
      .eq("submitted_by", user.id)
      .gte("report_date", startDate)
      .order("report_date", { ascending: false })
      .order("submitted_at", { ascending: false }),
    supabase
      .from("responsible_schedules")
      .select("*, centers(name)")
      .eq("responsible_id", user.id)
      .order("day_of_week"),
  ]);

  const assignedCenters =
    assignments
      ?.map((a) => a.centers as unknown as Center)
      .filter((c) => c && c.active) || [];

  const submissions: ResponsibleSubmission[] = (reports || []).map((r) => {
    const entryCount = Array.isArray(r.entries)
      ? (r.entries[0] as { count?: number })?.count || 0
      : 0;
    return {
      id: r.id,
      reportDate: r.report_date,
      submittedAt: r.submitted_at,
      centerName: getRelationName(r.center),
      centerId: r.center_id,
      entryCount,
    };
  });

  const schedules: ScheduleEntry[] = (scheduleRows || []).map((s) => ({
    centerId: s.center_id,
    centerName: getRelationName(s.centers),
    dayOfWeek: s.day_of_week,
    startTime: s.start_time.slice(0, 5),
    endTime: s.end_time.slice(0, 5),
  }));

  return { submissions, schedules, assignedCenters };
}

export async function getAllSchedules(): Promise<ResponsibleSchedule[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("responsible_schedules").select("*");
  return (data as ResponsibleSchedule[]) || [];
}

export async function getResponsibleSchedules(
  responsibleId: string
): Promise<ResponsibleSchedule[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("responsible_schedules")
    .select("*")
    .eq("responsible_id", responsibleId)
    .order("day_of_week");

  return (data as ResponsibleSchedule[]) || [];
}

export async function saveResponsibleSchedules(
  responsibleId: string,
  schedules: ScheduleInput[]
) {
  const supabase = await createClient();

  await supabase
    .from("responsible_schedules")
    .delete()
    .eq("responsible_id", responsibleId);

  if (schedules.length > 0) {
    const { error } = await supabase.from("responsible_schedules").insert(
      schedules.map((s) => ({
        responsible_id: responsibleId,
        center_id: s.centerId,
        day_of_week: s.dayOfWeek,
        start_time: s.startTime,
        end_time: s.endTime,
      }))
    );
    if (error) throw new Error(error.message);
  }

  revalidatePath("/admin/responsibles");
  revalidatePath("/responsible/stats");
}

export interface EmployeeHistoryEntry {
  date: string;
  centerName: string;
  status: AttendanceStatus;
  notes: string | null;
}

export interface EmployeeHistorySummary {
  worked: number;
  day_off: number;
  vacation: number;
  absence: number;
  sick: number;
  inactive: number;
  other: number;
}

export async function getEmployeeHistory(
  employeeId: string,
  year: number,
  month: number
): Promise<{ entries: EmployeeHistoryEntry[]; summary: EmployeeHistorySummary; employeeName: string }> {
  const supabase = await createClient();
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const daysInMonth = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

  const { data: employee } = await supabase
    .from("employees")
    .select("full_name")
    .eq("id", employeeId)
    .single();

  if (!employee) {
    return {
      entries: [],
      summary: { worked: 0, day_off: 0, vacation: 0, absence: 0, sick: 0, inactive: 0, other: 0 },
      employeeName: "—",
    };
  }

  const { data: reports } = await supabase
    .from("attendance_reports")
    .select("id, report_date, center:centers(name)")
    .gte("report_date", startDate)
    .lte("report_date", endDate);

  if (!reports?.length) {
    return {
      entries: [],
      summary: { worked: 0, day_off: 0, vacation: 0, absence: 0, sick: 0, inactive: 0, other: 0 },
      employeeName: employee.full_name,
    };
  }

  const reportMap = new Map(
    reports.map((r) => [
      r.id,
      { date: r.report_date, centerName: getRelationName(r.center) },
    ])
  );
  const reportIds = reports.map((r) => r.id);

  const { data: rawEntries } = await supabase
    .from("attendance_entries")
    .select("status, notes, report_id")
    .eq("employee_id", employeeId)
    .in("report_id", reportIds);

  const summary: EmployeeHistorySummary = {
    worked: 0,
    day_off: 0,
    vacation: 0,
    absence: 0,
    sick: 0,
    inactive: 0,
    other: 0,
  };

  const history: EmployeeHistoryEntry[] = [];

  rawEntries?.forEach((e) => {
    const report = reportMap.get(e.report_id);
    if (!report) return;

    const status = e.status as AttendanceStatus;
    summary[status]++;

    history.push({
      date: report.date,
      centerName: report.centerName,
      status,
      notes: e.notes,
    });
  });

  history.sort((a, b) => b.date.localeCompare(a.date));

  return { entries: history, summary, employeeName: employee.full_name };
}

export async function getEmployeeById(employeeId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("employees")
    .select("*, centers(name)")
    .eq("id", employeeId)
    .single();
  return data;
}
