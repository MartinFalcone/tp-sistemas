"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import {
  clearStoredPlayer,
  readStoredPlayer,
  writeStoredPlayer,
  type StoredPlayer,
} from "@/lib/player";
import { fetchJson, mensajeDeError } from "@/lib/fetchJson";
import { joinResponseSchema, NICKNAME_MAX_LENGTH } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Paper, PaperHeader } from "@/components/ui/Paper";

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
      // Reintentar es seguro: /api/join es idempotente por apodo. Si el primer
      // intento llegó y se perdió la respuesta, el segundo devuelve el mismo
      // jugador en vez de crear otro.
      const player = await fetchJson("/api/join", {
        method: "POST",
        body: { nickname: trimmed },
        schema: joinResponseSchema,
        timeoutMs: 10000,
        retries: 3,
      });

      writeStoredPlayer(player);
      router.push("/jugar");
    } catch (error) {
      setError(
        mensajeDeError(
          error,
          "No se pudo entrar a la partida. Esperá unos segundos y tocá Entrar de nuevo.",
        ),
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
    <Paper className="justify-center gap-8">
      <div>
        <PaperHeader left="Sistemas de Computación" right="TP · 2026" />

        <h1 className="font-mono text-3xl leading-[1.05] font-semibold tracking-tight uppercase">
          Impresoras de
          <br />
          matriz de punto
        </h1>
        <p className="mt-3 text-carbon">
          Entrá con un apodo. Sin contraseña.
        </p>
      </div>

      {stored === undefined ? (
        // Reserva de altura para que no salte la pantalla cuando termina de
        // leerse localStorage.
        <div aria-hidden className="h-[8.5rem]" />
      ) : stored ? (
        <section className="space-y-4">
          <p className="text-lg">
            Seguís como{" "}
            <strong className="font-mono font-semibold break-all">
              {stored.nickname}
            </strong>
          </p>
          <Button full onClick={() => router.push("/jugar")}>
            Continuar
          </Button>
          <div className="text-center">
            <Button variant="quiet" onClick={changeName}>
              Cambiar de nombre
            </Button>
          </div>
        </section>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <Input
            id="nickname"
            name="nickname"
            label="Apodo"
            value={nickname}
            onChange={(event) => {
              setNickname(event.target.value);
              if (error) setError(null);
            }}
            error={error}
            hint={`Hasta ${NICKNAME_MAX_LENGTH} caracteres. Lo van a ver todos en el ranking.`}
            maxLength={NICKNAME_MAX_LENGTH}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            disabled={submitting}
            placeholder="Martín"
          />

          <Button type="submit" full disabled={submitting}>
            {submitting ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      )}
    </Paper>
  );
}
