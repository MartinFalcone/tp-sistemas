"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Paper, PaperHeader } from "@/components/ui/Paper";
import type { ApiError } from "@/lib/types";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    params.get("error") === "config"
      ? "El panel no está configurado: falta ADMIN_PASSWORD en el entorno."
      : null,
  );
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const failure: ApiError = await response
          .json()
          .catch(() => ({ error: "No se pudo entrar." }));
        setError(failure.error);
        return;
      }

      const next = params.get("next");
      router.replace(next && next.startsWith("/admin") ? next : "/admin");
      router.refresh();
    } catch {
      setError("No hay conexión con el servidor. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Paper className="justify-center gap-6">
      <PaperHeader left="Panel de admin" right="Acceso" />

      <form onSubmit={submit} className="space-y-4" noValidate>
        <Input
          id="password"
          type="password"
          label="Contraseña"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={error}
          autoComplete="current-password"
          enterKeyHint="go"
          autoFocus
        />
        <Button type="submit" full disabled={busy}>
          {busy ? "Entrando…" : "Entrar"}
        </Button>
      </form>
    </Paper>
  );
}
