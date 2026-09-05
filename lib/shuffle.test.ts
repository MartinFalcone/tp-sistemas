import { describe, expect, it } from "vitest";

import { shuffle, shuffleForPlayer } from "./shuffle";
import type { Question } from "./types";

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

const opt = (id: string) => ({ id, text: `Item ${id}` });

describe("shuffle", () => {
  it("conserva todos los elementos", () => {
    const input = [1, 2, 3, 4, 5];
    const output = shuffle(input);
    expect([...output].sort()).toEqual([...input].sort());
  });

  it("no muta el original", () => {
    const input = [1, 2, 3];
    shuffle(input);
    expect(input).toEqual([1, 2, 3]);
  });

  it("aguanta vacío y de un solo elemento", () => {
    expect(shuffle([])).toEqual([]);
    expect(shuffle(["a"])).toEqual(["a"]);
  });
});

describe("shuffleForPlayer / order", () => {
  const question: Question = {
    ...meta,
    type: "order",
    payload: { items: [opt("1"), opt("2"), opt("3"), opt("4")] },
    answer: { order: ["1", "2", "3", "4"] },
  };

  it("cambia el orden de los ítems", () => {
    // random fijo en 0: Fisher-Yates lo convierte en una rotación, no identidad.
    const shuffled = shuffleForPlayer(question, () => 0);
    expect(shuffled.payload.items.map((i) => i.id)).not.toEqual([
      "1",
      "2",
      "3",
      "4",
    ]);
  });

  it("nunca devuelve el orden correcto", () => {
    // 200 barajados reales: si alguno saliera correcto, sería un punto regalado.
    for (let i = 0; i < 200; i++) {
      const shuffled = shuffleForPlayer(question);
      expect(shuffled.payload.items.map((item) => item.id)).not.toEqual([
        "1",
        "2",
        "3",
        "4",
      ]);
    }
  });

  it("conserva todos los ítems", () => {
    const shuffled = shuffleForPlayer(question);
    expect(shuffled.payload.items.map((i) => i.id).sort()).toEqual([
      "1",
      "2",
      "3",
      "4",
    ]);
  });

  it("no toca la respuesta correcta", () => {
    const shuffled = shuffleForPlayer(question);
    expect(shuffled.answer).toEqual({ order: ["1", "2", "3", "4"] });
  });
});

describe("shuffleForPlayer / match", () => {
  const question: Question = {
    ...meta,
    type: "match",
    payload: {
      left: [opt("l1"), opt("l2"), opt("l3")],
      right: [opt("r1"), opt("r2"), opt("r3")],
    },
    answer: { pairs: { l1: "r1", l2: "r2", l3: "r3" } },
  };

  it("baraja la derecha y deja la izquierda quieta", () => {
    const shuffled = shuffleForPlayer(question, () => 0);
    expect(shuffled.payload.left.map((i) => i.id)).toEqual(["l1", "l2", "l3"]);
    expect(shuffled.payload.right.map((i) => i.id).sort()).toEqual([
      "r1",
      "r2",
      "r3",
    ]);
  });
});

describe("shuffleForPlayer / el resto", () => {
  it("no toca single", () => {
    const question: Question = {
      ...meta,
      type: "single",
      payload: { choices: [opt("a"), opt("b"), opt("c")] },
      answer: { choiceId: "a" },
    };
    expect(shuffleForPlayer(question)).toEqual(question);
  });
});
