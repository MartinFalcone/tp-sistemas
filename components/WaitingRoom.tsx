"use client";

import { DotMatrixPrinter } from "./DotMatrixPrinter";

const WAITING_COPY = "Esperando que arranque la partida.";

/**
 * Sala de espera: cuánta gente entró y la animación de la impresora.
 *
 * `playerCount` es null mientras no llegó ninguna respuesta del servidor —
 * mostrar "0 personas" cuando todavía no sabemos sería mentir.
 */
export function WaitingRoom({ playerCount }: { playerCount: number | null }) {
  return (
    <div className="flex flex-1 flex-col justify-center gap-7">
      <div className="space-y-3">
        <h1 className="font-mono text-2xl leading-tight font-semibold uppercase text-balance">
          {WAITING_COPY}
        </h1>

        <p className="font-mono text-sm text-carbon" aria-live="polite">
          {playerCount === null ? (
            "Contando quién entró…"
          ) : (
            <>
              <span className="text-2xl font-semibold text-tinta tabular-nums">
                {playerCount}
              </span>{" "}
              {playerCount === 1 ? "persona entró" : "personas entraron"}
            </>
          )}
        </p>
      </div>

      <DotMatrixPrinter text={WAITING_COPY} />
    </div>
  );
}
