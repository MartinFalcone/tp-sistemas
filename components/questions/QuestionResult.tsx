"use client";

import clsx from "clsx";

import { OptionRow } from "@/components/ui/OptionRow";
import type { AnswerResult } from "@/lib/types";

/**
 * Resultado de una pregunta. Se muestra unos segundos y sigue solo.
 *
 * Es una exposición académica: cuando la respuesta está mal, lo que importa no
 * es el puntaje sino ver cuál era la correcta y por qué. Por eso el `hint` de la
 * pregunta se muestra solo al errar, y ocupa más lugar que el puntaje.
 */
export function QuestionResult({
  result,
  hint,
  durationMs,
}: {
  result: AnswerResult;
  /** `question.hint`: la explicación de una línea. */
  hint: string | null;
  /** Cuánto dura la pantalla, para dibujar la barra de avance. */
  durationMs: number;
}) {
  const { isCorrect, score, totalScore, position, totalPlayers } = result;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <header
        className={clsx(
          "flex items-center gap-3 border-y px-2 py-3",
          isCorrect ? "border-tinta bg-banda" : "border-cinta",
        )}
      >
        <span
          aria-hidden
          className={clsx(
            "font-mono text-3xl leading-none font-semibold",
            isCorrect ? "text-tinta" : "text-cinta",
          )}
        >
          {isCorrect ? "■" : "✗"}
        </span>
        <p
          className={clsx(
            "font-mono text-xl font-semibold tracking-[0.08em] uppercase",
            isCorrect ? "text-tinta" : "text-cinta",
          )}
        >
          {isCorrect ? "Correcta" : "Incorrecta"}
        </p>
      </header>

      {!isCorrect && (
        <section className="space-y-2">
          <h2 className="font-mono text-[0.6875rem] tracking-[0.14em] text-carbon uppercase">
            La correcta era
          </h2>
          {/* El barrido del cabezal: el único momento de movimiento. */}
          <OptionRow letter="■" state="correct" reveal>
            {result.correctText}
          </OptionRow>
          {hint ? (
            <p className="pt-1 text-[0.9375rem] leading-snug text-carbon">
              {hint}
            </p>
          ) : null}
        </section>
      )}

      <section className="mt-auto space-y-1 font-mono">
        <div className="flex items-baseline justify-between gap-3 border-t border-filete pt-2">
          <span className="text-[0.6875rem] tracking-[0.14em] text-carbon uppercase">
            Sumaste
          </span>
          <span className="text-2xl font-semibold tabular-nums">
            {score > 0 ? `+${score}` : "0"}
          </span>
        </div>

        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[0.6875rem] tracking-[0.14em] text-carbon uppercase">
            Total
          </span>
          <span className="text-base tabular-nums">{totalScore}</span>
        </div>

        {position !== null ? (
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[0.6875rem] tracking-[0.14em] text-carbon uppercase">
              Vas
            </span>
            <span className="text-base tabular-nums">
              {position}
              {totalPlayers !== null ? ` de ${totalPlayers}` : ""}
            </span>
          </div>
        ) : null}
      </section>

      {/* Barra de avance: mismo lenguaje que el cronómetro, para que se entienda
          que la pantalla se va sola y no hay que tocar nada. */}
      <div aria-hidden className="h-1 w-full overflow-hidden bg-filete">
        <div
          className="h-full bg-carbon"
          style={{
            animation: `resultado-avance ${durationMs}ms linear forwards`,
          }}
        />
      </div>

      <style>{`
        @keyframes resultado-avance {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
