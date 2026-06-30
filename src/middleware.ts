import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Fallback: /admin/pendiente exists in code but older production builds may not
  // include the route yet. Redirect to resumen-diario?view=pendiente which is live.
  if (pathname === "/admin/pendiente") {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/resumen-diario";
    url.searchParams.set("view", "pendiente");
    const date = searchParams.get("date");
    if (date) {
      url.searchParams.set("date", date);
    }
    return NextResponse.redirect(url);
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
