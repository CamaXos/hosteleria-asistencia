"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Center } from "@/lib/types/database";

export async function getCenters(): Promise<Center[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("centers")
    .select("*")
    .order("name");
  return data || [];
}

export async function createCenter(formData: FormData) {
  const supabase = await createClient();
  const name = formData.get("name") as string;
  const address = formData.get("address") as string;

  const { error } = await supabase.from("centers").insert({
    name,
    address: address || null,
    active: true,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/admin/centers");
}

export async function updateCenter(id: string, formData: FormData) {
  const supabase = await createClient();
  const name = formData.get("name") as string;
  const address = formData.get("address") as string;
  const active = formData.get("active") === "true";

  const { error } = await supabase
    .from("centers")
    .update({ name, address: address || null, active })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/centers");
}

export async function deleteCenter(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("centers").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/centers");
}
