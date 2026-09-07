import { describe, expect, it } from "vitest";

import { cleanInput } from "@/components/admin/questionDefaults";
import { questionInputSchema, type QuestionInput } from "./types";

/**
 * Una opción de la columna derecha a la que no apunta ningún par.
 *
 * Es lo que dejaba `removePair` al borrar un par de una pregunta sembrada: los
 * dos lados tienen slugs distintos ("tractor" → "fn-papel"), y la derecha se
 * filtraba por el id de la izquierda, así que no se borraba nada. El alumno
 * seguía viendo la respuesta del par que el expositor había borrado.
 */

const BASE = {
  prompt: "Uní cada componente con su función.",
  hint: null,
  points: 1000,
  time_limit: 60,
  is_active: true,
} as const;

function match(
  right: { id: string; text: string }[],
  pairs: Record<string, string>,
): QuestionInput {
  return {
    ...BASE,
    type: "match",
    payload: {
      left: [
        { id: "cabezal", text: "Cabezal de impresión" },
        { id: "tractor", text: "Tractor de arrastre" },
      ],
      right,
    },
    answer: { pairs },
  };
}

const SANA = match(
  [
    { id: "fn-agujas", text: "Contiene las agujas" },
    { id: "fn-papel", text: "Hace avanzar el papel" },
  ],
  { cabezal: "fn-agujas", tractor: "fn-papel" },
);

/** La forma exacta de la pregunta 4 rota: sobra "fn-carro" en la derecha. */
const CON_HUERFANA = match(
  [
    { id: "fn-agujas", text: "Contiene las agujas" },
    { id: "fn-carro", text: "Desplaza el carro" },
    { id: "fn-papel", text: "Hace avanzar el papel" },
  ],
  { cabezal: "fn-agujas", tractor: "fn-papel" },
);

describe("questionInputSchema / match", () => {
  it("acepta una pregunta con la derecha completa", () => {
    expect(questionInputSchema.safeParse(SANA).success).toBe(true);
  });

  it("rechaza una opción de la derecha sin par", () => {
    const parsed = questionInputSchema.safeParse(CON_HUERFANA);
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toContain("Sobra una opción");
  });
});

describe("cleanInput", () => {
  it("saca la opción huérfana que dejó el bug", () => {
    const limpia = cleanInput(CON_HUERFANA);
    expect(limpia).toMatchObject({
      payload: { right: [{ id: "fn-agujas" }, { id: "fn-papel" }] },
    });
    // Y lo que sale de limpiar tiene que poder guardarse.
    expect(questionInputSchema.safeParse(limpia).success).toBe(true);
  });

  it("no toca una pregunta que ya está bien", () => {
    expect(cleanInput(SANA)).toBe(SANA);
  });

  it("no toca los tipos que no son match", () => {
    const single: QuestionInput = {
      ...BASE,
      type: "single",
      payload: { choices: [{ id: "a", text: "9" }, { id: "b", text: "24" }] },
      answer: { choiceId: "b" },
    };
    expect(cleanInput(single)).toBe(single);
  });
});
