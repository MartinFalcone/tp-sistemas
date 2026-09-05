"use client";

import { useState } from "react";
import clsx from "clsx";

import type { QuestionComponentProps } from "./shared";

/**
 * Verdadero o falso: dos zonas iguales, mitad y mitad de lo que quede libre.
 *
 * Las dos tienen exactamente el mismo peso visual a propósito. Cualquier
 * diferencia de estilo entre una y otra sugiere cuál es la correcta.
 */
export function TrueFalseQuestion({
  onSubmit,
  disabled = false,
}: QuestionComponentProps<"truefalse">) {
  const [chosen, setChosen] = useState<boolean | null>(null);

  function choose(value: boolean) {
    if (disabled || chosen !== null) return;
    setChosen(value);
    onSubmit({ value });
  }

  return (
    <div className="grid min-h-0 flex-1 grid-rows-2 gap-2">
      {[true, false].map((value) => (
        <button
          key={String(value)}
          type="button"
          onClick={() => choose(value)}
          disabled={disabled || chosen !== null}
          className={clsx(
            "flex min-h-24 flex-col items-center justify-center gap-1 border border-tinta",
            "transition-transform duration-75 active:translate-y-px",
            "disabled:pointer-events-none disabled:opacity-45",
            chosen === value ? "bg-tinta text-papel" : "bg-papel",
          )}
        >
          <span aria-hidden className="font-mono text-5xl leading-none font-semibold">
            {value ? "V" : "F"}
          </span>
          <span className="font-mono text-xs tracking-[0.2em] uppercase">
            {value ? "Verdadero" : "Falso"}
          </span>
        </button>
      ))}
    </div>
  );
}
