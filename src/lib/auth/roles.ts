import type { UserRole } from "@/lib/types/database";

export function getRoleRedirectPath(role: UserRole): string {
  return role === "admin" ? "/admin" : "/responsible";
}
