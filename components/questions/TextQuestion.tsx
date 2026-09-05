"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { QuestionComponentProps } from "./shared";

/**
 * Respuesta corta.
 *
 * `autoCapitalize="none"` y `autoCorrect="off"` porque el autocorrector del
 * celular cambia términos técnicos ("cabezal" -> "cabeza") y arruinaría una
 * respuesta correcta. La corrección normaliza igual, pero mejor no pelearla.
 *
 * `enterKeyHint="send"` pone "Enviar" en la tecla del teclado del celular, y el
 * form envía con Enter sin necesidad de bajar hasta el botón.
 */
export function TextQuestion({
  question,
  onSubmit,
  disabled = false,
}: QuestionComponentProps<"text">) {
  const [text, setText] = useState("");
  const empty = text.trim() === "";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || empty) return;
    onSubmit({ text: text.trim() });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex min-h-0 flex-1 flex-col gap-4"
      noValidate
    >
      <Input
        id="respuesta"
        name="respuesta"
        label="Tu respuesta"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={question.payload.placeholder}
        disabled={disabled}
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="send"
        maxLength={80}
      />

      <Button type="submit" full disabled={disabled || empty}>
        Responder
      </Button>
    </form>
  );
}
