"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

const CHAR_MS = 70;
const HOLD_MS = 1800;

/**
 * Papel continuo saliendo de una impresora de matriz de punto: el texto se
 * "imprime" carácter por carácter y el cabezal viaja por la línea.
 *
 * El cabezal se posiciona en unidades `ch`, que en una tipografía monoespaciada
 * es exactamente el ancho de un carácter — no hace falta medir nada.
 */
export function DotMatrixPrinter({ text }: { text: string }) {
  const characters = [...text];
  const reduceMotion = useReducedMotion();
  const [printed, setPrinted] = useState(0);

  useEffect(() => {
    if (reduceMotion) {
      setPrinted(characters.length);
      return;
    }

    if (printed < characters.length) {
      const timer = setTimeout(() => setPrinted((n) => n + 1), CHAR_MS);
      return () => clearTimeout(timer);
    }

    // Línea completa: se sostiene un rato y vuelve a empezar.
    const timer = setTimeout(() => setPrinted(0), HOLD_MS);
    return () => clearTimeout(timer);
  }, [printed, characters.length, reduceMotion]);

  return (
    <div
      className="w-full overflow-hidden rounded-lg border border-paper-border bg-paper"
      role="img"
      aria-label={`Impresora de matriz de punto imprimiendo: ${text}`}
    >
      <div className="flex items-stretch">
        <FeedHoles />

        <div className="min-w-0 flex-1 px-2 py-5">
          {/* `inline-block` + `whitespace-pre` para que 1ch valga un carácter. */}
          <div className="relative inline-block font-mono text-[clamp(0.6rem,3vw,0.875rem)] leading-6 whitespace-pre">
            {/* Fantasma invisible: reserva el ancho de la línea completa para
                que el texto no salte mientras se imprime. */}
            <span aria-hidden className="invisible">
              {text}
            </span>

            <span className="absolute inset-0 text-paper-ink">
              {characters.slice(0, printed).join("")}
            </span>

            <motion.span
              aria-hidden
              className="absolute -top-1 h-8 w-[1.1ch] rounded-[2px] bg-accent/80"
              animate={{ left: `${printed}ch` }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { type: "tween", duration: CHAR_MS / 1000, ease: "linear" }
              }
            />
          </div>
        </div>

        <FeedHoles />
      </div>
    </div>
  );
}

/** La banda perforada del papel continuo, a los costados. */
function FeedHoles() {
  return (
    <div
      aria-hidden
      className="flex w-5 shrink-0 flex-col items-center justify-around border-x border-dashed border-paper-border py-1"
    >
      {Array.from({ length: 4 }, (_, index) => (
        <span
          key={index}
          className="size-1.5 rounded-full border border-paper-border bg-background"
        />
      ))}
    </div>
  );
}
