"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { readStoredPlayer, type StoredPlayer } from "@/lib/player";
import { useGameState } from "@/lib/useGameState";
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

  // Antes de hidratar no sabemos si hay jugador guardado. Sin este texto la
  // pantalla queda en blanco mientras baja el JS, que con datos móviles malos
  // puede ser un par de segundos.
  if (player === undefined) {
    return <Shell>{<Centered>Cargando…</Centered>}</Shell>;
  }

  if (player === null) {
    return <Shell>{<Centered>Llevándote al ingreso…</Centered>}</Shell>;
  }

  return (
    <Shell nickname={player.nickname} connected={connected}>
      {state === null ? (
        <Centered>
          {loading
            ? "Conectando con la partida…"
            : "No se pudo conectar con la partida. Se reintenta solo, no cierres esta pantalla."}
        </Centered>
      ) : state.status === "lobby" ? (
        <WaitingRoom playerCount={state.playerCount} />
      ) : state.status === "running" ? (
        <PlayScreen />
      ) : (
        <Centered>La partida terminó. Llevándote al ranking…</Centered>
      )}
    </Shell>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center text-center text-muted">
      {children}
    </div>
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
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-6 py-8">
      <header className="flex min-h-6 items-center justify-between gap-3">
        {nickname ? (
          <p className="truncate text-sm text-muted">
            Entraste como{" "}
            <span className="font-medium text-foreground">{nickname}</span>
          </p>
        ) : (
          <span />
        )}
        <ConnectionBadge connected={connected} />
      </header>

      {children}
    </main>
  );
}
