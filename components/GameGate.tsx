"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { fetchJson } from "@/lib/fetchJson";
import {
  readStoredPlayer,
  writeStoredPlayer,
  type StoredPlayer,
} from "@/lib/player";
import { joinResponseSchema } from "@/lib/types";
import { useGameState } from "@/lib/useGameState";
import { Paper, PaperHeader } from "@/components/ui/Paper";
import { QuestionSkeleton } from "@/components/ui/Skeleton";
import { ConnectionBadge } from "./ConnectionBadge";
import { PlayScreen } from "./PlayScreen";
import { WaitingRoom } from "./WaitingRoom";

/**
 * /jugar — decide qué pantalla mostrar según `game_state.status`, consultado
 * cada 2 segundos.
 *
 * Regla de oro para el aula: un fetch que falla no cambia de pantalla ni borra
 * lo que ya sabíamos. Se sigue mostrando el último estado conocido con el aviso
 * de "sin conexión" y el polling reintenta solo.
 */
export function GameGate() {
  const router = useRouter();
  const [player, setPlayer] = useState<StoredPlayer | null | undefined>(undefined);
  const { state, connected, loading } = useGameState(2000);

  // Sin jugador guardado no hay nada que jugar: vuelve al ingreso.
  useEffect(() => {
    const stored = readStoredPlayer();
    setPlayer(stored);
    if (!stored) router.replace("/");
  }, [router]);

  useEffect(() => {
    if (state?.status === "finished") router.replace("/ranking");
  }, [state?.status, router]);

  // El `playerId` guardado es una copia de una fila de la base, y "Reiniciar
  // todo" borra los jugadores. Después de un reinicio ese id ya no existe:
  // /api/answer contesta 404, la cola lo toma como error permanente y lo
  // descarta, y el alumno juega las 12 preguntas sin que se guarde ninguna, sin
  // ver un solo error. Así que una vez por ronda se vuelve a pedir el id con el
  // mismo apodo. /api/join es idempotente por apodo: si el jugador sigue
  // existiendo devuelve exactamente el mismo, y si no, lo recrea.
  const roundKey = state ? (state.startedAt ?? "lobby") : null;
  const rejoinedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!player || roundKey === null) return;
    if (rejoinedRef.current === roundKey) return;
    rejoinedRef.current = roundKey;

    let cancelled = false;

    void (async () => {
      try {
        const refreshed = await fetchJson("/api/join", {
          method: "POST",
          body: { nickname: player.nickname },
          schema: joinResponseSchema,
          timeoutMs: 10000,
          retries: 3,
        });
        if (cancelled || refreshed.playerId === player.playerId) return;
        writeStoredPlayer(refreshed);
        setPlayer(refreshed);
      } catch {
        // Sin conexión se sigue con el id guardado: si todavía existe, funciona
        // igual, y dejar a alguien afuera de la partida por esto sería peor.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [player, roundKey]);

  // Antes de hidratar no sabemos si hay jugador guardado. Sin este texto la
  // pantalla queda en blanco mientras baja el JS, que con datos móviles malos
  // puede ser un par de segundos.
  if (player === undefined) {
    return (
      <Shell>
        <QuestionSkeleton />
      </Shell>
    );
  }

  if (player === null) {
    return (
      <Shell>
        <Centered>Llevándote al ingreso…</Centered>
      </Shell>
    );
  }

  return (
    <Shell nickname={player.nickname} connected={connected}>
      {state === null ? (
        loading ? (
          <QuestionSkeleton />
        ) : (
          <Centered>
            No se pudo conectar con la partida. Se reintenta solo, no cierres
            esta pantalla.
          </Centered>
        )
      ) : state.status === "lobby" ? (
        <WaitingRoom playerCount={state.playerCount} />
      ) : state.status === "running" ? (
        <PlayScreen
          playerId={player.playerId}
          startedAt={state.startedAt}
          endsAt={state.endsAt}
        />
      ) : (
        <Centered>La partida terminó. Llevándote al ranking…</Centered>
      )}
    </Shell>
  );
}

function Shell({
  nickname,
  connected = true,
  children,
}: {
  nickname?: string;
  connected?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Paper>
      <PaperHeader
        left={nickname ? `Jugador · ${nickname}` : "Impresoras de matriz de punto"}
        right={<ConnectionBadge connected={connected} />}
      />
      {children}
    </Paper>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center text-center text-carbon">
      {children}
    </div>
  );
}
