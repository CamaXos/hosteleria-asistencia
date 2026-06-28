import { redirect } from "next/navigation";

export default function MonthlyPage() {
  redirect("/admin/analytics#grid");
}
