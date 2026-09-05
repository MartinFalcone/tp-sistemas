"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { ChoiceButton } from "./ChoiceButton";
import type { QuestionComponentProps } from "./shared";

/**
 * Varias correctas. Se marcan y desmarcan, y recién se envía al confirmar.
 *
 * El aviso de que hay más de una respuesta va arriba de las opciones y no en el
 * enunciado: es una instrucción de la mecánica, no parte de la pregunta.
 */
export function MultipleQuestion({
  question,
  onSubmit,
  disabled = false,
}: QuestionComponentProps<"multiple">) {
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(choiceId: string) {
    if (disabled) return;
    setSelected((current) =>
      current.includes(choiceId)
        ? current.filter((id) => id !== choiceId)
        : [...current, choiceId],
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <p className="font-mono text-[0.6875rem] tracking-[0.14em] text-carbon uppercase">
        Hay más de una respuesta correcta
      </p>

      <div className="flex flex-col gap-2">
        {question.payload.choices.map((choice, index) => (
          <ChoiceButton
            key={choice.id}
            index={index}
            text={choice.text}
            selected={selected.includes(choice.id)}
            disabled={disabled}
            showCheck
            onClick={() => toggle(choice.id)}
          />
        ))}
      </div>

      <Button
        full
        className="mt-auto"
        disabled={disabled || selected.length === 0}
        onClick={() => onSubmit({ choiceIds: selected })}
      >
        {selected.length === 0
          ? "Elegí al menos una"
          : `Confirmar · ${selected.length} ${selected.length === 1 ? "elegida" : "elegidas"}`}
      </Button>
    </div>
  );
}
