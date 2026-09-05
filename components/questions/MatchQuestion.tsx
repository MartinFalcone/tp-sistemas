"use client";

import { useState } from "react";
import clsx from "clsx";

import { Button } from "@/components/ui/Button";
import { pairShape, type QuestionComponentProps } from "./shared";

/**
 * Unir pares. Se toca un ítem de la izquierda, se resalta, y se toca su par de
 * la derecha.
 *
 * Los pares armados comparten una FORMA, no un color: con seis pares, seis
 * colores distinguibles en un celular con reflejo son imposibles, y encima
 * dejarían afuera a quien tenga daltonismo. La forma se lee siempre.
 *
 * Tocar cualquiera de los dos lados de un par armado lo deshace.
 */
export function MatchQuestion({
  question,
  onSubmit,
  disabled = false,
}: QuestionComponentProps<"match">) {
  const { left, right } = question.payload;
  const [pairs, setPairs] = useState<Record<string, string>>({});
  const [activeLeft, setActiveLeft] = useState<string | null>(null);

  /** Índice del par, para que la forma sea estable según el orden de la izquierda. */
  const shapeIndexOf = (leftId: string) =>
    left.findIndex((item) => item.id === leftId);

  const rightToLeft = new Map(
    Object.entries(pairs).map(([leftId, rightId]) => [rightId, leftId]),
  );

  function tapLeft(leftId: string) {
    if (disabled) return;

    if (pairs[leftId]) {
      // Ya está unido: se deshace.
      setPairs((current) => {
        const next = { ...current };
        delete next[leftId];
        return next;
      });
      setActiveLeft(null);
      return;
    }

    setActiveLeft((current) => (current === leftId ? null : leftId));
  }

  function tapRight(rightId: string) {
    if (disabled) return;

    const ownerLeft = rightToLeft.get(rightId);

    // Tocar un derecho ya unido lo libera, sin importar si hay algo activo.
    if (ownerLeft) {
      setPairs((current) => {
        const next = { ...current };
        delete next[ownerLeft];
        return next;
      });
      return;
    }

    if (!activeLeft) return;

    setPairs((current) => ({ ...current, [activeLeft]: rightId }));
    setActiveLeft(null);
  }

  const complete = Object.keys(pairs).length === left.length;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <p className="font-mono text-[0.6875rem] tracking-[0.14em] text-carbon uppercase">
        {activeLeft
          ? "Ahora tocá su par de la derecha"
          : "Tocá uno de la izquierda"}
      </p>

      <div className="grid grid-cols-2 gap-2">
        <ul className="flex flex-col gap-1.5">
          {left.map((item) => {
            const paired = pairs[item.id];
            const shape = pairShape(shapeIndexOf(item.id));

            return (
              <li key={item.id}>
                <MatchCell
                  text={item.text}
                  glyph={paired ? shape.glyph : null}
                  active={activeLeft === item.id}
                  paired={Boolean(paired)}
                  disabled={disabled}
                  label={
                    paired
                      ? `${item.text}, unido con forma ${shape.name}. Tocá para deshacer.`
                      : `${item.text}. Tocá para elegir.`
                  }
                  onClick={() => tapLeft(item.id)}
                />
              </li>
            );
          })}
        </ul>

        <ul className="flex flex-col gap-1.5">
          {right.map((item) => {
            const ownerLeft = rightToLeft.get(item.id);
            const shape = ownerLeft
              ? pairShape(shapeIndexOf(ownerLeft))
              : null;

            return (
              <li key={item.id}>
                <MatchCell
                  text={item.text}
                  glyph={shape?.glyph ?? null}
                  active={false}
                  paired={Boolean(ownerLeft)}
                  disabled={disabled}
                  label={
                    shape
                      ? `${item.text}, unido con forma ${shape.name}. Tocá para deshacer.`
                      : item.text
                  }
                  onClick={() => tapRight(item.id)}
                />
              </li>
            );
          })}
        </ul>
      </div>

      <Button
        full
        className="mt-auto"
        disabled={disabled || !complete}
        onClick={() => onSubmit({ pairs })}
      >
        {complete
          ? "Confirmar"
          : `Faltan ${left.length - Object.keys(pairs).length}`}
      </Button>
    </div>
  );
}

function MatchCell({
  text,
  glyph,
  active,
  paired,
  disabled,
  label,
  onClick,
}: {
  text: string;
  glyph: string | null;
  active: boolean;
  paired: boolean;
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={clsx(
        "flex min-h-14 w-full items-center gap-1.5 border px-2 py-2 text-left",
        "transition-transform duration-75 active:translate-y-px",
        "disabled:pointer-events-none disabled:opacity-45",
        active && "border-2 border-cinta bg-papel",
        !active && paired && "border-tinta bg-banda",
        !active && !paired && "border-tinta bg-papel",
      )}
    >
      <span
        aria-hidden
        className={clsx(
          "w-[1.5ch] shrink-0 text-center font-mono text-base leading-none font-semibold",
          active ? "text-cinta" : "text-tinta",
        )}
      >
        {active ? "▸" : (glyph ?? "")}
      </span>
      <span className="min-w-0 flex-1 text-sm leading-snug break-words">
        {text}
      </span>
    </button>
  );
}
