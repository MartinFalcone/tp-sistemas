"use client";

import { useEffect, useRef, useState } from "react";

import { ProgressDots } from "@/components/ui/ProgressDots";
import { Timer } from "@/components/ui/Timer";

/** Cada cuánto se recalcula el tiempo restante. */
const TICK_MS = 200;

/**
 * Contenedor común de toda pregunta: número, enunciado, cronómetro y el slot.
 *
 * El tiempo se calcula contra `deadline` (un timestamp) y no descontando de un
 * contador. Así no acumula deriva, y si el celular suspende la pantalla o la
 * pestaña queda en segundo plano, al volver muestra el tiempo real en vez de
 * seguir desde donde se quedó.
 *
 * En la partida de verdad el `deadline` lo va a fijar el servidor: el celular
 * no decide cuánto tiempo tuvo.
 */
export function QuestionShell({
  index,
  total,
  answered,
  prompt,
  deadline,
  timeLimitMs,
  onTimeout,
  children,
}: {
  /** Número de pregunta, empezando en 1. */
  index: number;
  total: number;
  answered: number;
  prompt: string;
  /** Timestamp en ms en que se acaba el tiempo. null = sin cronómetro. */
  deadline: number | null;
  timeLimitMs: number;
  onTimeout: () => void;
  children: React.ReactNode;
}) {
  const [remaining, setRemaining] = useState(() =>
    deadline === null ? timeLimitMs : Math.max(0, deadline - Date.now()),
  );

  // Se guarda en un ref para que cambiar el callback no reinicie el intervalo.
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  useEffect(() => {
    if (deadline === null) return;

    let fired = false;

    function tick() {
      const left = Math.max(0, deadline! - Date.now());
      setRemaining(left);

      if (left <= 0 && !fired) {
        fired = true;
        onTimeoutRef.current();
      }
    }

    tick();
    const timer = setInterval(tick, TICK_MS);
    return () => clearInterval(timer);
  }, [deadline]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <header className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="shrink-0 font-mono text-[0.6875rem] tracking-[0.14em] text-carbon uppercase tabular-nums">
            {index} de {total}
          </p>
          <ProgressDots total={total} current={index} answered={answered} />
        </div>

        <Timer remainingMs={remaining} totalMs={timeLimitMs} />
      </header>

      <h1 className="text-xl leading-snug font-semibold text-balance">
        {prompt}
      </h1>

      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
