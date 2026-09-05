"use client";

import { useState } from "react";

import { ChoiceButton } from "./ChoiceButton";
import type { QuestionComponentProps } from "./shared";

/**
 * Opción única. Un toque selecciona y envía: no hay botón de confirmar, que es
 * un toque extra que nadie necesita cuando la respuesta es una sola.
 *
 * Se marca la elegida antes de avisarle al padre para que el dedo vea qué tocó,
 * aunque la red tarde en responder.
 */
export function SingleQuestion({
  question,
  onSubmit,
  disabled = false,
}: QuestionComponentProps<"single">) {
  const [chosen, setChosen] = useState<string | null>(null);

  function choose(choiceId: string) {
    if (disabled || chosen !== null) return;
    setChosen(choiceId);
    onSubmit({ choiceId });
  }

  return (
    <div className="flex flex-col gap-2">
      {question.payload.choices.map((choice, index) => (
        <ChoiceButton
          key={choice.id}
          index={index}
          text={choice.text}
          selected={chosen === choice.id}
          disabled={disabled || chosen !== null}
          onClick={() => choose(choice.id)}
        />
      ))}
    </div>
  );
}
