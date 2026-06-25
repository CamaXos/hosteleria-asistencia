import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { getRoleRedirectPath } from "@/lib/auth/roles";

export default async function HomePage() {
  const profile = await getProfile();
  if (!profile) {
    redirect("/login");
  }
  redirect(getRoleRedirectPath(profile.role));
}
