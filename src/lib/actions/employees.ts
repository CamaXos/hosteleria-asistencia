"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/middleware";
import { requireRole } from "@/lib/auth";
import {
  generateSecurePassword,
} from "@/lib/auth/responsible-credentials";
import {
  normalizeUsername,
  toInternalEmail,
  validateUsername,
  type ResponsibleCredentials,
} from "@/lib/auth/responsible-auth";
import { revalidatePath } from "next/cache";
import {
  MAX_RESPONSIBLES_PER_CENTER,
  MIN_RESPONSIBLES_PER_CENTER,
} from "@/lib/constants";
import type { Employee, Profile } from "@/lib/types/database";

export async function getEmployees(centerId?: string): Promise<Employee[]> {
  const supabase = await createClient();
  let query = supabase.from("employees").select("*").order("full_name");

  if (centerId) {
    query = query.eq("center_id", centerId);
  }

  const { data } = await query;
  return data || [];
}

export async function createEmployee(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const center_id = formData.get("center_id") as string;
  const full_name = formData.get("full_name") as string;
  const dni_nie = (formData.get("dni_nie") as string) || null;
  const phone = (formData.get("phone") as string) || null;
  const position = (formData.get("position") as string) || null;
  const start_date = (formData.get("start_date") as string) || new Date().toISOString().split("T")[0];

  const { data: employee, error } = await supabase
    .from("employees")
    .insert({
      center_id,
      full_name,
      dni_nie,
      phone,
      position,
      start_date,
      active: true,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await supabase.from("employee_status_logs").insert({
    employee_id: employee.id,
    action: "created",
    performed_by: user.id,
    notes: "Alta de empleado",
  });

  revalidatePath("/admin/employees");
  revalidatePath("/responsible");
  return employee;
}

export async function deactivateEmployee(employeeId: string, notes?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const today = new Date().toISOString().split("T")[0];

  const { error } = await supabase
    .from("employees")
    .update({ active: false, end_date: today })
    .eq("id", employeeId);

  if (error) throw new Error(error.message);

  await supabase.from("employee_status_logs").insert({
    employee_id: employeeId,
    action: "deactivated",
    performed_by: user.id,
    notes: notes || "Baja de empleado",
  });

  revalidatePath("/admin/employees");
  revalidatePath("/responsible");
}

export async function activateEmployee(employeeId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase
    .from("employees")
    .update({ active: true, end_date: null })
    .eq("id", employeeId);

  if (error) throw new Error(error.message);

  await supabase.from("employee_status_logs").insert({
    employee_id: employeeId,
    action: "activated",
    performed_by: user.id,
    notes: "Reactivación de empleado",
  });

  revalidatePath("/admin/employees");
}

export async function updateEmployee(id: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const start_date =
    (formData.get("start_date") as string) || new Date().toISOString().split("T")[0];

  const { error } = await supabase
    .from("employees")
    .update({
      full_name: formData.get("full_name") as string,
      dni_nie: (formData.get("dni_nie") as string) || null,
      phone: (formData.get("phone") as string) || null,
      position: (formData.get("position") as string) || null,
      center_id: formData.get("center_id") as string,
      start_date,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  if (user) {
    await supabase.from("employee_status_logs").insert({
      employee_id: id,
      action: "updated",
      performed_by: user.id,
      notes: "Actualización de datos",
    });
  }

  revalidatePath("/admin/employees");
}

type ResponsibleWithCenters = Profile & { center_ids: string[] };

async function fetchResponsiblesWithCenters(
  active: boolean
): Promise<ResponsibleWithCenters[]> {
  const supabase = await createClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "responsible")
    .eq("active", active)
    .order("full_name");

  if (!profiles) return [];

  const { data: assignments } = await supabase
    .from("responsible_centers")
    .select("responsible_id, center_id");

  return profiles.map((p) => ({
    ...p,
    center_ids:
      assignments
        ?.filter((a) => a.responsible_id === p.id)
        .map((a) => a.center_id) || [],
  }));
}

export async function getActiveResponsibles(): Promise<ResponsibleWithCenters[]> {
  return fetchResponsiblesWithCenters(true);
}

export async function getInactiveResponsibles(): Promise<ResponsibleWithCenters[]> {
  return fetchResponsiblesWithCenters(false);
}

/** @deprecated Use getActiveResponsibles or getInactiveResponsibles */
export async function getResponsibles(): Promise<ResponsibleWithCenters[]> {
  return getActiveResponsibles();
}

async function assignCentersToResponsible(
  serviceClient: ReturnType<typeof createServiceClient>,
  userId: string,
  centerIds: string[]
) {
  for (const centerId of centerIds) {
    const { data: count } = await serviceClient.rpc(
      "count_responsibles_for_center",
      { p_center_id: centerId }
    );

    if ((count as number) >= MAX_RESPONSIBLES_PER_CENTER) {
      throw new Error(
        `El centro ya tiene el máximo de ${MAX_RESPONSIBLES_PER_CENTER} responsables`
      );
    }

    await serviceClient.from("responsible_centers").insert({
      responsible_id: userId,
      center_id: centerId,
    });
  }
}

export async function createResponsibleWithUsername(
  username: string,
  fullName: string,
  centerIds: string[]
): Promise<ResponsibleCredentials> {
  await requireRole("admin");

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY no configurada");
  }

  const usernameError = validateUsername(username);
  if (usernameError) throw new Error(usernameError);

  const normalizedUsername = normalizeUsername(username);
  const trimmedName = fullName.trim();
  if (!trimmedName) throw new Error("El nombre completo es obligatorio");

  const serviceClient = createServiceClient();

  const { data: existing } = await serviceClient
    .from("profiles")
    .select("id")
    .eq("username", normalizedUsername)
    .maybeSingle();

  if (existing) throw new Error("Este usuario ya está en uso");

  const email = toInternalEmail(normalizedUsername);
  const password = generateSecurePassword(12);

  const { data: authData, error: authError } =
    await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: trimmedName,
        role: "responsible",
        username: normalizedUsername,
      },
    });

  if (authError) throw new Error(authError.message);

  const userId = authData.user.id;

  await serviceClient
    .from("profiles")
    .update({
      full_name: trimmedName,
      role: "responsible",
      active: true,
      username: normalizedUsername,
    })
    .eq("id", userId);

  await assignCentersToResponsible(serviceClient, userId, centerIds);

  revalidatePath("/admin/responsibles");
  return { username: normalizedUsername, password };
}

export async function resetResponsiblePassword(
  responsibleId: string
): Promise<ResponsibleCredentials> {
  await requireRole("admin");

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY no configurada");
  }

  const serviceClient = createServiceClient();

  const { data: profile, error: profileError } = await serviceClient
    .from("profiles")
    .select("username, role")
    .eq("id", responsibleId)
    .single();

  if (profileError || !profile) {
    throw new Error("Responsable no encontrado");
  }

  if (profile.role !== "responsible") {
    throw new Error("Solo se puede resetear la contraseña de responsables");
  }

  if (!profile.username) {
    throw new Error("Este responsable no tiene usuario configurado");
  }

  const password = generateSecurePassword(12);

  const { error: authError } = await serviceClient.auth.admin.updateUserById(
    responsibleId,
    { password }
  );

  if (authError) throw new Error(authError.message);

  revalidatePath("/admin/responsibles");
  return { username: profile.username, password };
}

export async function updateResponsibleAssignments(
  responsibleId: string,
  centerIds: string[]
) {
  const supabase = await createClient();

  for (const centerId of centerIds) {
    const { data: count } = await supabase.rpc("count_responsibles_for_center", {
      p_center_id: centerId,
    });

    const { data: existing } = await supabase
      .from("responsible_centers")
      .select("id")
      .eq("center_id", centerId)
      .eq("responsible_id", responsibleId)
      .maybeSingle();

    if (!existing && (count as number) >= MAX_RESPONSIBLES_PER_CENTER) {
      throw new Error(
        `Un centro ya tiene el máximo de ${MAX_RESPONSIBLES_PER_CENTER} responsables`
      );
    }
  }

  await supabase
    .from("responsible_centers")
    .delete()
    .eq("responsible_id", responsibleId);

  if (centerIds.length > 0) {
    const { error } = await supabase.from("responsible_centers").insert(
      centerIds.map((center_id) => ({
        responsible_id: responsibleId,
        center_id,
      }))
    );
    if (error) throw new Error(error.message);
  }

  revalidatePath("/admin/responsibles");
}

export async function deactivateResponsible(id: string) {
  await requireRole("admin");

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ active: false, deactivated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("role", "responsible");

  if (error) throw new Error(error.message);
  revalidatePath("/admin/responsibles");
}

export async function reactivateResponsible(id: string) {
  await requireRole("admin");

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ active: true, deactivated_at: null })
    .eq("id", id)
    .eq("role", "responsible");

  if (error) throw new Error(error.message);
  revalidatePath("/admin/responsibles");
}

export async function validateCenterResponsibles(centerId: string): Promise<{
  count: number;
  valid: boolean;
}> {
  const supabase = await createClient();
  const { data: count } = await supabase.rpc("count_responsibles_for_center", {
    p_center_id: centerId,
  });

  const c = (count as number) || 0;
  return {
    count: c,
    valid: c >= MIN_RESPONSIBLES_PER_CENTER && c <= MAX_RESPONSIBLES_PER_CENTER,
  };
}
