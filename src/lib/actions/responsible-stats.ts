"use server";

import { createClient } from "@/lib/supabase/server";
import { subDays, format } from "date-fns";
import { formatTimeMadrid, getTodayISO } from "@/lib/utils";
import type { AttendanceStatus, Center, Profile } from "@/lib/types/database";

export interface ResponsibleSubmission {
  id: string;
  reportDate: string;
  submittedAt: string;
  centerName: string;
  centerId: string;
  entryCount: number;
}

export interface ResponsibleStatsData {
  submissions: ResponsibleSubmission[];
  assignedCenters: Center[];
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
    return { submissions: [], assignedCenters: [] };
  }

  const startDate = format(subDays(new Date(), 2), "yyyy-MM-dd");

  const [{ data: assignments }, { data: reports }] = await Promise.all([
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

  return { submissions, assignedCenters };
}

export async function fetchEmployeeHistoryForMonth(
  employeeId: string,
  year: number,
  month: number
) {
  const { entries, summary } = await getEmployeeHistory(employeeId, year, month);
  return { entries, summary };
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

  const { data: employee, error: employeeError } = await supabase
    .from("employees")
    .select("full_name")
    .eq("id", employeeId)
    .maybeSingle();

  if (employeeError) {
    console.error("getEmployeeHistory employee:", employeeError.message);
    return {
      entries: [],
      summary: { worked: 0, day_off: 0, vacation: 0, absence: 0, sick: 0, inactive: 0, other: 0 },
      employeeName: "—",
    };
  }

  if (!employee) {
    return {
      entries: [],
      summary: { worked: 0, day_off: 0, vacation: 0, absence: 0, sick: 0, inactive: 0, other: 0 },
      employeeName: "—",
    };
  }

  const { data: reports, error: reportsError } = await supabase
    .from("attendance_reports")
    .select("id, report_date, center:centers(name)")
    .gte("report_date", startDate)
    .lte("report_date", endDate);

  if (reportsError) {
    console.error("getEmployeeHistory reports:", reportsError.message);
    return {
      entries: [],
      summary: { worked: 0, day_off: 0, vacation: 0, absence: 0, sick: 0, inactive: 0, other: 0 },
      employeeName: employee.full_name,
    };
  }

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

  const { data: rawEntries, error: entriesError } = await supabase
    .from("attendance_entries")
    .select("status, notes, report_id")
    .eq("employee_id", employeeId)
    .in("report_id", reportIds);

  if (entriesError) {
    console.error("getEmployeeHistory entries:", entriesError.message);
    return {
      entries: [],
      summary: { worked: 0, day_off: 0, vacation: 0, absence: 0, sick: 0, inactive: 0, other: 0 },
      employeeName: employee.full_name,
    };
  }

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
    if (status in summary) {
      summary[status]++;
    }

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
  const { data, error } = await supabase
    .from("employees")
    .select("*, centers(name)")
    .eq("id", employeeId)
    .maybeSingle();

  if (error) {
    console.error("getEmployeeById:", error.message);
    return null;
  }

  return data;
}

export interface ResponsibleSubmissionEntry {
  date: string;
  centerId: string;
  centerName: string;
  status: "submitted" | "pending" | "future";
  submittedAt: string | null;
  submittedTime: string | null;
  submitterName: string | null;
}

export interface ResponsibleSubmissionSummary {
  submitted: number;
  pending: number;
  future: number;
}

export async function getResponsibleById(responsibleId: string) {
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", responsibleId)
    .eq("role", "responsible")
    .maybeSingle();

  if (error || !profile) {
    console.error("getResponsibleById:", error?.message);
    return null;
  }

  const { data: assignments } = await supabase
    .from("responsible_centers")
    .select("center_id, centers(id, name, active)")
    .eq("responsible_id", responsibleId);

  const centers =
    assignments
      ?.map((a) => a.centers as unknown as Center)
      .filter((c) => c && c.active) || [];

  return {
    ...(profile as Profile),
    centers,
  };
}

function getProfileName(rel: unknown): string {
  if (!rel) return "—";
  if (Array.isArray(rel)) return (rel[0] as { full_name?: string } | undefined)?.full_name || "—";
  return (rel as { full_name?: string }).full_name || "—";
}

export async function getResponsibleSubmissionHistory(
  responsibleId: string,
  year: number,
  month: number
): Promise<{
  entries: ResponsibleSubmissionEntry[];
  summary: ResponsibleSubmissionSummary;
  responsibleName: string;
  centerNames: string[];
}> {
  const supabase = await createClient();
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const daysInMonth = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;
  const today = getTodayISO();

  const responsible = await getResponsibleById(responsibleId);
  if (!responsible) {
    return {
      entries: [],
      summary: { submitted: 0, pending: 0, future: 0 },
      responsibleName: "—",
      centerNames: [],
    };
  }

  const centerIds = responsible.centers.map((c) => c.id);

  const { data: reports, error: reportsError } = await supabase
    .from("attendance_reports")
    .select("center_id, report_date, submitted_at, submitted_by, center:centers(name), submitter:profiles!attendance_reports_submitted_by_fkey(full_name)")
    .in("center_id", centerIds.length > 0 ? centerIds : ["00000000-0000-0000-0000-000000000000"])
    .gte("report_date", startDate)
    .lte("report_date", endDate);

  if (reportsError) {
    console.error("getResponsibleSubmissionHistory reports:", reportsError.message);
    return {
      entries: [],
      summary: { submitted: 0, pending: 0, future: 0 },
      responsibleName: responsible.full_name,
      centerNames: responsible.centers.map((c) => c.name),
    };
  }

  const reportByCenterDate = new Map<
    string,
    { submittedAt: string; centerName: string; submitterName: string; submittedBy: string }
  >();
  for (const r of reports || []) {
    const key = `${r.report_date}|${r.center_id}`;
    reportByCenterDate.set(key, {
      submittedAt: r.submitted_at,
      centerName: getRelationName(r.center),
      submitterName: getProfileName(r.submitter),
      submittedBy: r.submitted_by,
    });
  }

  const entries: ResponsibleSubmissionEntry[] = [];
  const summary: ResponsibleSubmissionSummary = {
    submitted: 0,
    pending: 0,
    future: 0,
  };

  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    for (const center of responsible.centers) {
      const reportKey = `${date}|${center.id}`;
      const report = reportByCenterDate.get(reportKey);

      let status: ResponsibleSubmissionEntry["status"];

      if (date > today) {
        status = "future";
        summary.future++;
      } else if (report) {
        status = "submitted";
        summary.submitted++;
      } else {
        status = "pending";
        summary.pending++;
      }

      entries.push({
        date,
        centerId: center.id,
        centerName: report?.centerName || center.name,
        status,
        submittedAt: report?.submittedAt ?? null,
        submittedTime: report?.submittedAt ? formatTimeMadrid(report.submittedAt) : null,
        submitterName: report?.submitterName ?? null,
      });
    }
  }

  entries.sort((a, b) => b.date.localeCompare(a.date) || a.centerName.localeCompare(b.centerName));

  return {
    entries,
    summary,
    responsibleName: responsible.full_name,
    centerNames: responsible.centers.map((c) => c.name),
  };
}
