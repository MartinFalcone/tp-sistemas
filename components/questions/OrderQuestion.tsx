"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import type { QuestionComponentProps } from "./shared";

/**
 * Ordenar pasos.
 *
 * El mecanismo son flechas de subir y bajar, no drag. En un celular el drag
 * pelea contra el scroll de la página y contra el gesto de "atrás" del borde;
 * las flechas funcionan siempre, con guantes, con el celular apoyado y con
 * lectores de pantalla. Para el único día que esto tiene que funcionar, la
 * opción infalible gana sobre la vistosa.
 *
 * Cada movimiento se anuncia en una región `aria-live` porque, si no, quien usa
 * lector de pantalla no tiene forma de saber que la lista cambió.
 */
export function OrderQuestion({
  question,
  onSubmit,
  disabled = false,
}: QuestionComponentProps<"order">) {
  const [items, setItems] = useState(question.payload.items);
  const [announcement, setAnnouncement] = useState("");

  function move(from: number, to: number) {
    if (disabled) return;
    if (to < 0 || to >= items.length) return;

    setItems((current) => {
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });

    setAnnouncement(
      `${items[from].text}, ahora en la posición ${to + 1} de ${items.length}`,
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <p className="font-mono text-[0.6875rem] tracking-[0.14em] text-carbon uppercase">
        Ordenalos con las flechas
      </p>

      <ol className="flex flex-col gap-1.5">
        {items.map((item, index) => (
          <li
            key={item.id}
            className="flex min-h-14 items-center gap-2 border border-tinta px-2 py-1.5"
          >
            <span
              aria-hidden
              className="grid size-8 shrink-0 place-items-center bg-tinta font-mono text-sm font-semibold text-papel tabular-nums"
            >
              {index + 1}
            </span>

            <span className="min-w-0 flex-1 text-[0.9375rem] leading-snug">
              {item.text}
            </span>

            <span className="flex shrink-0 flex-col">
              <ArrowButton
                label={`Subir ${item.text}`}
                glyph="▲"
                disabled={disabled || index === 0}
                onClick={() => move(index, index - 1)}
              />
              <ArrowButton
                label={`Bajar ${item.text}`}
                glyph="▼"
                disabled={disabled || index === items.length - 1}
                onClick={() => move(index, index + 1)}
              />
            </span>
          </li>
        ))}
      </ol>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <Button
        full
        className="mt-auto"
        disabled={disabled}
        onClick={() => onSubmit({ order: items.map((item) => item.id) })}
      >
        Confirmar orden
      </Button>
    </div>
  );
}

/**
 * 22px de alto cada una, apiladas: el par suma los 44px de área táctil y cada
 * flecha queda con el ancho completo del bloque.
 */
function ArrowButton({
  label,
  glyph,
  disabled,
  onClick,
}: {
  label: string;
  glyph: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid h-[22px] w-11 place-items-center border border-tinta font-mono text-xs transition-transform duration-75 active:translate-y-px disabled:opacity-30"
    >
      <span aria-hidden>{glyph}</span>
    </button>
  );
}
