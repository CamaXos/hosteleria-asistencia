"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { resolveLoginEmail } from "@/lib/auth/responsible-auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { getErrorMessage } from "@/lib/utils";
import { ClipboardList, LogIn } from "lucide-react";

const DEACTIVATED_MESSAGE =
  "Su cuenta está desactivada. Contacte con administración.";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("deactivated") === "1") {
      setError(DEACTIVATED_MESSAGE);
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();
      const email = resolveLoginEmail(loginId);
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
        throw new Error(DEACTIVATED_MESSAGE);
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
            <p className="text-sm text-blue-100">Accede con tu usuario o email corporativo</p>
          </div>
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && <Alert variant="error">{error}</Alert>}

              <div>
                <Input
                  label="Usuario o email"
                  type="text"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  required
                  autoComplete="username"
                  placeholder="resp-la-plaza-01"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Responsables: use solo su usuario (ej. resp-la-plaza-01). Administradores: use su email completo.
                </p>
              </div>

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

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
