import { describe, expect, it } from "vitest";

import { describeAnswer } from "./answerText";
import { positionsOf, rankOf, type StandingEntry } from "./ranking";
import type { Question } from "./types";

/** Campos de fila que no hacen al caso. */
const meta = {
  id: "00000000-0000-4000-8000-000000000001",
  order_index: 1,
  prompt: "¿?",
  hint: null,
  points: 1000,
  time_limit: 25,
  is_active: true,
  created_at: null,
} as const;

const opt = (id: string, text: string) => ({ id, text });

describe("describeAnswer", () => {
  it("single: el texto de la opción correcta", () => {
    const question: Question = {
      ...meta,
      type: "single",
      payload: { choices: [opt("a", "Agujas"), opt("b", "Rodillo")] },
      answer: { choiceId: "b" },
    };
    expect(describeAnswer(question)).toBe("Rodillo");
  });

  it("single: no revienta si el id correcto ya no existe", () => {
    const question: Question = {
      ...meta,
      type: "single",
      payload: { choices: [opt("a", "Agujas"), opt("b", "Rodillo")] },
      answer: { choiceId: "borrada" },
    };
    expect(describeAnswer(question)).toContain("ya no existe");
  });

  it("multiple: une las correctas con +", () => {
    const question: Question = {
      ...meta,
      type: "multiple",
      payload: {
        choices: [opt("a", "Impacto"), opt("b", "Copias"), opt("c", "Color")],
      },
      answer: { choiceIds: ["a", "b"] },
    };
    expect(describeAnswer(question)).toBe("Impacto + Copias");
  });

  it("truefalse: Verdadero o Falso", () => {
    const base = { ...meta, type: "truefalse", payload: {} } as const;
    expect(describeAnswer({ ...base, answer: { value: true } })).toBe("Verdadero");
    expect(describeAnswer({ ...base, answer: { value: false } })).toBe("Falso");
  });

  it("order: los textos en orden, con flechas", () => {
    const question: Question = {
      ...meta,
      type: "order",
      payload: { items: [opt("1", "Buffer"), opt("2", "Cabezal"), opt("3", "Papel")] },
      answer: { order: ["1", "2", "3"] },
    };
    expect(describeAnswer(question)).toBe("Buffer → Cabezal → Papel");
  });

  it("match: los pares resueltos a texto", () => {
    const question: Question = {
      ...meta,
      type: "match",
      payload: {
        left: [opt("l1", "9 agujas"), opt("l2", "24 agujas")],
        right: [opt("r1", "Borrador"), opt("r2", "Casi carta")],
      },
      answer: { pairs: { l1: "r1", l2: "r2" } },
    };
    expect(describeAnswer(question)).toBe(
      "9 agujas → Borrador · 24 agujas → Casi carta",
    );
  });

  it("slider: valor, unidad y tolerancia", () => {
    const base = {
      ...meta,
      type: "slider",
      payload: { min: 0, max: 500, step: 10, unit: "cps" },
    } as const;
    expect(describeAnswer({ ...base, answer: { value: 300, tolerance: 20 } })).toBe(
      "300 cps (±20)",
    );
    expect(describeAnswer({ ...base, answer: { value: 300, tolerance: 0 } })).toBe(
      "300 cps",
    );
  });

  it("text: la primera variante aceptada", () => {
    const question: Question = {
      ...meta,
      type: "text",
      payload: { placeholder: "" },
      answer: { accepted: ["cabezal de impresión", "cabezal"] },
    };
    expect(describeAnswer(question)).toBe("cabezal de impresión");
  });

  it("nunca devuelve el objeto crudo ni tira", () => {
    // Si alguna rama devolviera el JSON del answer, se filtraría la respuesta.
    const question: Question = {
      ...meta,
      type: "single",
      payload: { choices: [opt("a", "Agujas"), opt("b", "Rodillo")] },
      answer: { choiceId: "a" },
    };
    const text = describeAnswer(question);
    expect(text).not.toContain("choiceId");
    expect(text).not.toContain("{");
  });
});

describe("rankOf y positionsOf", () => {
  const e = (
    playerId: string,
    nickname: string,
    score: number,
    elapsedMs: number,
  ): StandingEntry => ({
    playerId,
    nickname,
    score,
    elapsedMs,
    correct: 0,
    answered: 3,
  });

  // Ya vienen ordenados como los deja loadStandings: puntaje desc, tiempo asc.
  const ranked: StandingEntry[] = [
    e("a", "Ana", 900, 5000),
    e("b", "Beto", 700, 4000),
    e("c", "Cami", 700, 9000),
    e("d", "Dani", 100, 1000),
  ];

  it("cuenta desde 1", () => {
    expect(rankOf(ranked, "a")).toBe(1);
  });

  it("a igual puntaje, gana quien tardó menos", () => {
    // Beto y Cami empatan en 700, pero Beto tardó 4 s y Cami 9 s.
    expect(rankOf(ranked, "b")).toBe(2);
    expect(rankOf(ranked, "c")).toBe(3);
  });

  it("solo comparten puesto con puntaje Y tiempo iguales", () => {
    const empatados: StandingEntry[] = [
      e("a", "Ana", 900, 5000),
      e("b", "Beto", 700, 4000),
      e("c", "Cami", 700, 4000),
      e("d", "Dani", 100, 1000),
    ];
    expect(positionsOf(empatados)).toEqual([1, 2, 2, 4]);
  });

  it("devuelve null si el jugador no respondió nada", () => {
    expect(rankOf(ranked, "fantasma")).toBeNull();
  });

  it("aguanta una tabla vacía", () => {
    expect(rankOf([], "a")).toBeNull();
    expect(positionsOf([])).toEqual([]);
  });
});
