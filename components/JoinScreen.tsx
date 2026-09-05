"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

import {
  clearStoredPlayer,
  readStoredPlayer,
  writeStoredPlayer,
  type StoredPlayer,
} from "@/lib/player";
import {
  joinResponseSchema,
  NICKNAME_MAX_LENGTH,
  type ApiError,
} from "@/lib/types";

/**
 * Pantalla de ingreso.
 *
 * Tres estados posibles al cargar:
 *  - "leyendo": todavía no se leyó localStorage. No se puede leer durante el
 *    render del servidor, así que hay que esperar al efecto o React tira un
 *    error de hidratación.
 *  - jugador guardado: se ofrece continuar sin volver a escribir el apodo.
 *  - sin jugador: el formulario.
 */
export function JoinScreen() {
  const router = useRouter();
  const [stored, setStored] = useState<StoredPlayer | null | undefined>(undefined);
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setStored(readStoredPlayer());
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const trimmed = nickname.replace(/\s+/gu, " ").trim();

    // Las mismas reglas corren en el servidor. Acá es solo para no gastar un
    // viaje de red con conexión mala.
    if (trimmed === "") {
      setError("Escribí un apodo para entrar.");
      return;
    }
    if ([...trimmed].length > NICKNAME_MAX_LENGTH) {
      setError(
        `El apodo no puede tener más de ${NICKNAME_MAX_LENGTH} caracteres. Probá con uno más corto.`,
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ nickname: trimmed }),
      });

      const body: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message = (body as ApiError | null)?.error;
        setError(
          message ??
            "No se pudo entrar a la partida. Esperá unos segundos y tocá Entrar de nuevo.",
        );
        return;
      }

      const parsed = joinResponseSchema.safeParse(body);
      if (!parsed.success) {
        setError(
          "El servidor respondió algo inesperado. Recargá la página y probá de nuevo.",
        );
        return;
      }

      writeStoredPlayer(parsed.data);
      router.push("/jugar");
    } catch {
      setError(
        "No hay conexión con el servidor. Revisá tus datos móviles y tocá Entrar de nuevo.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function changeName() {
    clearStoredPlayer();
    setStored(null);
    setNickname("");
    setError(null);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-8 px-6 py-10">
      <header className="space-y-2">
        <p className="font-mono text-xs tracking-widest text-muted uppercase">
          Sistemas de Computación
        </p>
        <h1 className="text-3xl font-semibold text-balance">
          Impresoras de matriz de punto
        </h1>
        <p className="text-muted">
          Entrá con un apodo para jugar. No hace falta contraseña.
        </p>
      </header>

      {stored === undefined ? (
        // Placeholder de la misma altura que el contenido real, para que no
        // salte la pantalla cuando termina de leerse localStorage.
        <div aria-hidden className="h-[7.5rem] animate-pulse rounded-xl bg-surface" />
      ) : stored ? (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 rounded-xl border border-border bg-surface p-5"
        >
          <p className="text-lg">
            Seguís como{" "}
            <strong className="font-semibold break-all">{stored.nickname}</strong>
          </p>
          <button
            type="button"
            onClick={() => router.push("/jugar")}
            className="w-full rounded-lg bg-accent px-4 py-3.5 font-semibold text-accent-foreground transition-opacity active:opacity-80"
          >
            Continuar
          </button>
          <button
            type="button"
            onClick={changeName}
            className="w-full text-sm text-muted underline underline-offset-4"
          >
            Cambiar de nombre
          </button>
        </motion.section>
      ) : (
        <motion.form
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="space-y-4"
          noValidate
        >
          <div className="space-y-2">
            <label htmlFor="nickname" className="block text-sm font-medium">
              Tu apodo
            </label>
            <input
              id="nickname"
              name="nickname"
              value={nickname}
              onChange={(event) => {
                setNickname(event.target.value);
                if (error) setError(null);
              }}
              maxLength={NICKNAME_MAX_LENGTH}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="go"
              disabled={submitting}
              placeholder="Ej: Martín"
              aria-invalid={error !== null}
              aria-describedby={error ? "nickname-error" : "nickname-hint"}
              className="w-full rounded-lg border border-border bg-surface px-4 py-3.5 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 disabled:opacity-60"
            />
            <p id="nickname-hint" className="text-xs text-muted">
              Hasta {NICKNAME_MAX_LENGTH} caracteres. Lo van a ver todos en el ranking.
            </p>
          </div>

          {error && (
            <p
              id="nickname-error"
              role="alert"
              className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm text-danger"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-accent px-4 py-3.5 font-semibold text-accent-foreground transition-opacity active:opacity-80 disabled:opacity-60"
          >
            {submitting ? "Entrando…" : "Entrar"}
          </button>
        </motion.form>
      )}
    </main>
  );
}
