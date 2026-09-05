"use client";

import clsx from "clsx";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Fila de opción: la unidad de la pantalla de pregunta y de la de resultado.
 *
 * Aquí vive el sistema de estados de DESIGN.md. Ninguno depende solo del color —
 * cada uno tiene color + forma + textura, y se distingue en escala de grises:
 *
 *   correcta    banda verde   ■   doble golpe (semibold)
 *   incorrecta  rojo cinta    ✗   sobreimpresión (tachado)
 *   sin elegir  carbón        ·   modo borrador (filete punteado)
 */

export type OptionState =
  | "idle"
  | "selected"
  | "correct"
  | "incorrect"
  | "unanswered";

const MARKERS: Record<OptionState, string> = {
  idle: "",
  selected: "▸",
  correct: "■",
  incorrect: "✗",
  unanswered: "·",
};

/** Duración del barrido del cabezal. El único movimiento memorable. */
const SWEEP_MS = 450;

type OptionRowProps = {
  /** A, B, C, D… */
  letter: string;
  children: React.ReactNode;
  state?: OptionState;
  /** Línea secundaria: "tu respuesta", "CORRECTA". */
  note?: React.ReactNode;
  onSelect?: () => void;
  /**
   * Dispara el barrido del cabezal al revelar la respuesta correcta.
   * Solo tiene efecto con `state="correct"`.
   */
  reveal?: boolean;
};

export function OptionRow({
  letter,
  children,
  state = "idle",
  note,
  onSelect,
  reveal = false,
}: OptionRowProps) {
  const reduceMotion = useReducedMotion();
  const sweeping = reveal && state === "correct" && !reduceMotion;

  const body = (
    <>
      {/* El cabezal barre la fila una vez y deja impreso el resultado. */}
      {sweeping ? (
        <>
          {/* Capa de abajo: la fila en modo borrador, todavía sin imprimir. */}
          <RowContent letter={letter} state="unanswered" note={note} hidden>
            {children}
          </RowContent>

          {/* Capa de arriba: la fila impresa, revelada por el clip. Es la que
              queda accesible — la de abajo va con aria-hidden. */}
          <motion.div
            className="absolute inset-0"
            initial={{ clipPath: "inset(0 100% 0 0)" }}
            animate={{ clipPath: "inset(0 0% 0 0)" }}
            transition={{ duration: SWEEP_MS / 1000, ease: "linear" }}
          >
            <RowContent letter={letter} state="correct" note={note}>
              {children}
            </RowContent>
          </motion.div>

          <motion.span
            aria-hidden
            className="absolute inset-y-0 w-2 -translate-x-1/2 bg-tinta"
            initial={{ left: "0%" }}
            animate={{ left: "100%" }}
            transition={{ duration: SWEEP_MS / 1000, ease: "linear" }}
          />
        </>
      ) : (
        <RowContent letter={letter} state={state} note={note}>
          {children}
        </RowContent>
      )}
    </>
  );

  if (!onSelect) {
    return <div className="relative overflow-hidden">{body}</div>;
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={state === "selected"}
      className="relative block w-full overflow-hidden text-left"
    >
      {body}
    </button>
  );
}

function RowContent({
  letter,
  state,
  note,
  hidden = false,
  children,
}: {
  letter: string;
  state: OptionState;
  note?: React.ReactNode;
  /** Capa decorativa del barrido: se oculta a los lectores de pantalla. */
  hidden?: boolean;
  children: React.ReactNode;
}) {
  const marker = MARKERS[state];

  return (
    <div
      aria-hidden={hidden || undefined}
      className={clsx(
        "flex min-h-11 items-start gap-2.5 border-b px-1.5 py-2.5",
        state === "correct" && "border-tinta bg-banda",
        state === "incorrect" && "border-filete",
        state === "unanswered" && "border-dashed border-filete",
        (state === "idle" || state === "selected") && "border-filete",
      )}
    >
      {/* Columna de marcador, ancho fijo en la grilla de caracteres. */}
      <span
        aria-hidden
        className={clsx(
          "w-[1.25ch] shrink-0 pt-0.5 text-center font-mono text-sm font-semibold",
          state === "correct" && "text-tinta",
          state === "incorrect" && "text-cinta",
          state === "unanswered" && "text-carbon",
          state === "selected" && "text-cinta",
        )}
      >
        {marker}
      </span>

      {/* Bloque de la letra. */}
      <span
        aria-hidden
        className={clsx(
          "grid size-7 shrink-0 place-items-center font-mono text-sm font-semibold",
          state === "correct" && "bg-tinta text-papel",
          state === "selected" && "bg-tinta text-papel",
          state === "incorrect" && "border border-cinta text-cinta",
          state === "unanswered" && "border border-dashed border-filete text-carbon",
          state === "idle" && "border border-tinta text-tinta",
        )}
      >
        {letter}
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={clsx(
            "block text-[0.9375rem] leading-snug",
            state === "correct" && "font-semibold text-tinta",
            state === "incorrect" && "text-cinta line-through decoration-2",
            state === "unanswered" && "text-carbon",
            (state === "idle" || state === "selected") && "text-tinta",
          )}
        >
          {children}
        </span>

        {note ? (
          <span
            className={clsx(
              "mt-0.5 block font-mono text-[0.6875rem] tracking-[0.14em] uppercase",
              state === "incorrect" ? "text-cinta" : "text-carbon",
            )}
          >
            {note}
          </span>
        ) : null}
      </span>
    </div>
  );
}
