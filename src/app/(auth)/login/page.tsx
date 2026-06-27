"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { getErrorMessage } from "@/lib/utils";
import { ClipboardList, LogIn } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, active")
        .eq("id", data.user.id)
        .single();

      if (!profile?.active) {
        await supabase.auth.signOut();
        throw new Error("Tu cuenta está desactivada. Contacta con el administrador.");
      }

      router.push(profile.role === "admin" ? "/admin" : "/responsible");
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-[var(--primary-light)] p-4">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--primary)] text-white shadow-lg">
          <ClipboardList className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Hostelería Asistencia</h1>
        <p className="mt-2 text-sm text-slate-500">Sistema de control de asistencia</p>
      </div>

      <div className="w-full max-w-md">
        <Card noPadding className="overflow-hidden shadow-md">
          <div className="bg-[var(--primary)] px-6 py-4">
            <h2 className="text-lg font-semibold text-white">Iniciar sesión</h2>
            <p className="text-sm text-blue-100">Accede con tu cuenta corporativa</p>
          </div>
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && <Alert variant="error">{error}</Alert>}

              <Input
                label="Correo electrónico"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="tu@email.com"
              />

              <Input
                label="Contraseña"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
              />

              <Button type="submit" variant="accent" className="w-full" size="lg" loading={loading}>
                <LogIn className="h-4 w-4" />
                Iniciar sesión
              </Button>
            </form>
          </div>
        </Card>

        <p className="mt-6 text-center text-xs text-slate-400">
          Gestión de asistencia para centros de hostelería
        </p>
      </div>
    </div>
  );
}
