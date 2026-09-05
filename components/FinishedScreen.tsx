"use client";

import { useGameState } from "@/lib/useGameState";

/**
 * "Terminaste": el jugador ya respondió todo y espera a que cierre la partida.
 *
 * La posición es provisoria y se actualiza sola, porque el resto sigue jugando.
 * Cuando `game_state.status` pase a `finished`, el polling de `GameGate`
 * redirige a `/ranking` — acá no hace falta manejar eso.
 */
export function FinishedScreen({
  playerId,
  pendingCount,
}: {
  playerId: string;
  /** Respuestas que todavía no se pudieron enviar. */
  pendingCount: number;
}) {
  // Intervalo más largo que el de la partida: acá ya no hay apuro y este poll
  // es el caro (agrega todas las respuestas para calcular la posición).
  const { state } = useGameState(4000, playerId);
  const me = state?.me ?? null;

  return (
    <div className="flex min-h-0 flex-1 flex-col justify-center gap-6">
      <div className="space-y-1">
        <h1 className="font-mono text-3xl font-semibold uppercase">
          Terminaste
        </h1>
        <p className="text-carbon">
          Esperá a que el expositor cierre la partida.
        </p>
      </div>

      <dl className="font-mono">
        <div className="flex items-baseline justify-between gap-3 papel-doble-filete pt-2">
          <dt className="text-[0.6875rem] tracking-[0.14em] text-carbon uppercase">
            Tu puntaje
          </dt>
          <dd className="text-4xl font-semibold tabular-nums">
            {me ? me.totalScore : "—"}
          </dd>
        </div>

        {me?.rank ? (
          <div className="flex items-baseline justify-between gap-3 border-t border-filete pt-2">
            <dt className="text-[0.6875rem] tracking-[0.14em] text-carbon uppercase">
              Vas
            </dt>
            <dd className="text-base tabular-nums">
              {me.rank} de {me.totalPlayers}
            </dd>
          </div>
        ) : null}

        {me ? (
          <div className="flex items-baseline justify-between gap-3 border-t border-filete pt-2">
            <dt className="text-[0.6875rem] tracking-[0.14em] text-carbon uppercase">
              Respondidas
            </dt>
            <dd className="text-base tabular-nums">{me.answered}</dd>
          </div>
        ) : null}
      </dl>

      {me?.rank ? (
        <p className="text-sm text-carbon">
          La posición es provisoria: el resto todavía está jugando.
        </p>
      ) : null}

      {pendingCount > 0 ? (
        <p role="status" className="text-sm text-cinta">
          {pendingCount === 1
            ? "Queda 1 respuesta sin enviar."
            : `Quedan ${pendingCount} respuestas sin enviar.`}{" "}
          Se envían solas cuando vuelva la conexión. No cierres esta pantalla.
        </p>
      ) : null}
    </div>
  );
}
