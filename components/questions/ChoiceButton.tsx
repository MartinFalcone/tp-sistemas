"use client";

import clsx from "clsx";

import { optionShape } from "./shared";

/**
 * Opción tocable de `single` y `multiple`.
 *
 * 56px de alto: es un target de pulgar, no de mouse. El feedback táctil es una
 * bajada de 1px en 75ms — el golpe de una tecla, sin escalas ni sombras.
 *
 * El estado elegido no depende del color: además de invertirse a tinta, la
 * forma se rellena y aparece un `✓` a la derecha.
 */
export function ChoiceButton({
  index,
  text,
  selected = false,
  disabled = false,
  showCheck = false,
  onClick,
}: {
  index: number;
  text: string;
  selected?: boolean;
  disabled?: boolean;
  /** `multiple` muestra el tilde; `single` no, porque envía al instante. */
  showCheck?: boolean;
  onClick: () => void;
}) {
  const shape = optionShape(index);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={showCheck ? selected : undefined}
      aria-label={`${shape.name}: ${text}`}
      className={clsx(
        "flex min-h-14 w-full items-center gap-3 border px-3 py-2.5 text-left",
        "transition-transform duration-75 active:translate-y-px",
        "disabled:pointer-events-none disabled:opacity-45",
        selected ? "border-tinta bg-tinta text-papel" : "border-tinta bg-papel",
      )}
    >
      <span
        aria-hidden
        className={clsx(
          "grid size-9 shrink-0 place-items-center border font-mono text-lg leading-none",
          selected
            ? "border-papel bg-papel text-tinta"
            : "border-tinta text-tinta",
        )}
      >
        {shape.glyph}
      </span>

      <span className="min-w-0 flex-1 text-[0.9375rem] leading-snug">
        {text}
      </span>

      {showCheck ? (
        <span
          aria-hidden
          className={clsx(
            "w-[2ch] shrink-0 text-center font-mono text-lg font-semibold",
            selected ? "text-papel" : "text-carbon/40",
          )}
        >
          {selected ? "✓" : "·"}
        </span>
      ) : null}
    </button>
  );
}
