"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Paper, PaperHeader } from "@/components/ui/Paper";
import { fetchJson, mensajeDeError } from "@/lib/fetchJson";

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
      await fetchJson("/api/admin/login", {
        method: "POST",
        body: { password },
        timeoutMs: 12000,
        retries: 2,
      });

      const next = params.get("next");
      router.replace(next && next.startsWith("/admin") ? next : "/admin");
      router.refresh();
    } catch (error) {
      setError(mensajeDeError(error, "No se pudo entrar."));
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
