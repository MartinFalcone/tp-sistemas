"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

const CHAR_MS = 70;
const HOLD_MS = 1800;

/**
 * El cabezal imprimiendo el texto carácter por carácter, sobre una banda del
 * papel pautado.
 *
 * El cabezal se posiciona en unidades `ch`, que en una tipografía monoespaciada
 * es exactamente el ancho de un carácter — no hace falta medir nada.
 *
 * Es la excepción a "un solo momento de movimiento": vive en la única pantalla
 * donde la gente está esperando y no tiene nada que hacer.
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
      className="w-full overflow-hidden border-y border-filete bg-banda px-2 py-5"
      role="img"
      aria-label={`Impresora de matriz de punto imprimiendo: ${text}`}
    >
      {/* `inline-block` + `whitespace-pre` para que 1ch valga un carácter. */}
      <div className="relative inline-block font-mono text-[clamp(0.6rem,3vw,0.8125rem)] leading-6 whitespace-pre">
        {/* Fantasma invisible: reserva el ancho de la línea completa para que
            el texto no salte mientras se imprime. */}
        <span aria-hidden className="invisible">
          {text}
        </span>

        <span className="absolute inset-0 text-tinta">
          {characters.slice(0, printed).join("")}
        </span>

        <motion.span
          aria-hidden
          className="absolute -top-1 h-8 w-[1.1ch] bg-tinta"
          animate={{ left: `${printed}ch` }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { type: "tween", duration: CHAR_MS / 1000, ease: "linear" }
          }
        />
      </div>
    </div>
  );
}
