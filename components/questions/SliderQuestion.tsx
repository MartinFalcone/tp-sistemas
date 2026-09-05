"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import type { QuestionComponentProps } from "./shared";

/** Redondea al `step` más cercano dentro del rango. */
function snap(value: number, min: number, max: number, step: number): number {
  const stepped = min + Math.round((value - min) / step) * step;
  return Math.min(max, Math.max(min, stepped));
}

/**
 * Estimación numérica. El valor va en grande arriba, porque en un slider de
 * celular el pulgar tapa justo la zona donde uno miraría el número.
 */
export function SliderQuestion({
  question,
  onSubmit,
  disabled = false,
}: QuestionComponentProps<"slider">) {
  const { min, max, step, unit } = question.payload;
  const [value, setValue] = useState(() =>
    snap((min + max) / 2, min, max, step),
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <p
        className="text-center font-mono leading-none font-semibold tabular-nums"
        aria-hidden
      >
        <span className="text-6xl">{value}</span>
        {unit ? (
          <span className="ml-1.5 text-xl text-carbon">{unit}</span>
        ) : null}
      </p>

      <div>
        <input
          type="range"
          className="papel-slider"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(event) => setValue(Number(event.target.value))}
          aria-label={question.prompt}
          aria-valuetext={unit ? `${value} ${unit}` : String(value)}
        />

        <div className="flex justify-between font-mono text-xs text-carbon tabular-nums">
          <span>{min}</span>
          <span>{max}</span>
        </div>
      </div>

      <Button
        full
        className="mt-auto"
        disabled={disabled}
        onClick={() => onSubmit({ value })}
      >
        Responder
      </Button>
    </div>
  );
}
