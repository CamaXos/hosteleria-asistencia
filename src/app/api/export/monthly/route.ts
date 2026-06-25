import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMonthlyAttendance } from "@/lib/actions/attendance";
import { generateMonthlyCSV } from "@/lib/utils/csv-server";
import type { AttendanceStatus } from "@/lib/types/database";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const centerId = searchParams.get("centerId");
  const year = Number(searchParams.get("year"));
  const month = Number(searchParams.get("month"));
  const format = searchParams.get("format") || "csv";
  const employeeFilter = searchParams.get("employee") || undefined;
  const statusFilter = (searchParams.get("status") as AttendanceStatus) || undefined;

  if (!centerId || !year || !month) {
    return NextResponse.json({ error: "Parámetros incompletos" }, { status: 400 });
  }

  const { data: center } = await supabase
    .from("centers")
    .select("name")
    .eq("id", centerId)
    .single();

  const rows = await getMonthlyAttendance(
    centerId,
    year,
    month,
    employeeFilter,
    statusFilter
  );

  if (format === "csv") {
    const csv = generateMonthlyCSV(rows, year, month, center?.name || "");
    return new NextResponse("\uFEFF" + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="asistencia_${month}_${year}.csv"`,
      },
    });
  }

  return NextResponse.json({ error: "Formato no soportado en API. Usa exportación Excel desde la UI." }, { status: 400 });
}
