"use client";

import { motion } from "framer-motion";

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
    <div className="flex flex-1 flex-col justify-center gap-8">
      <div className="space-y-3 text-center">
        <h1 className="text-2xl font-semibold text-balance">{WAITING_COPY}</h1>

        <p className="text-muted" aria-live="polite">
          {playerCount === null ? (
            "Contando quién entró…"
          ) : (
            <>
              <motion.strong
                key={playerCount}
                initial={{ scale: 1.25 }}
                animate={{ scale: 1 }}
                className="inline-block font-semibold text-foreground tabular-nums"
              >
                {playerCount}
              </motion.strong>{" "}
              {playerCount === 1 ? "persona entró" : "personas entraron"}
            </>
          )}
        </p>
      </div>

      <DotMatrixPrinter text={WAITING_COPY} />
    </div>
  );
}
