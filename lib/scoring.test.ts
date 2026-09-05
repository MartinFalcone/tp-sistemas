import { describe, expect, it } from "vitest";

import { computeScore, grade } from "./scoring";
import {
  levenshtein,
  normalizeAnswerText,
  normalizeNickname,
} from "./normalize";
import type { QuestionCore } from "./types";

// ---------------------------------------------------------------------------
// Helpers: preguntas mínimas de cada tipo
// ---------------------------------------------------------------------------

const opts = (...ids: string[]) => ids.map((id) => ({ id, text: `Opción ${id}` }));

const single: QuestionCore = {
  type: "single",
  payload: { choices: opts("a", "b", "c") },
  answer: { choiceId: "b" },
};

const multiple: QuestionCore = {
  type: "multiple",
  payload: { choices: opts("a", "b", "c", "d") },
  answer: { choiceIds: ["a", "b", "c"] },
};

const truefalse: QuestionCore = {
  type: "truefalse",
  payload: {},
  answer: { value: true },
};

const order: QuestionCore = {
  type: "order",
  payload: { items: opts("1", "2", "3", "4") },
  answer: { order: ["1", "2", "3", "4"] },
};

const match: QuestionCore = {
  type: "match",
  payload: { left: opts("l1", "l2"), right: opts("r1", "r2") },
  answer: { pairs: { l1: "r1", l2: "r2" } },
};

const slider: QuestionCore = {
  type: "slider",
  payload: { min: 0, max: 200, step: 1, unit: "cps" },
  answer: { value: 100, tolerance: 10 },
};

const text: QuestionCore = {
  type: "text",
  payload: { placeholder: "Escribí tu respuesta" },
  answer: { accepted: ["cabeza de impresión", "cabezal"] },
};

// ---------------------------------------------------------------------------
// single
// ---------------------------------------------------------------------------

describe("grade / single", () => {
  it("acepta la opción correcta", () => {
    expect(grade(single, { choiceId: "b" })).toEqual({
      isCorrect: true,
      ratio: 1,
    });
  });

  it("rechaza una opción incorrecta", () => {
    expect(grade(single, { choiceId: "a" })).toEqual({
      isCorrect: false,
      ratio: 0,
    });
  });

  it("rechaza una opción inexistente", () => {
    expect(grade(single, { choiceId: "zzz" }).isCorrect).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// multiple — crédito parcial
// ---------------------------------------------------------------------------

describe("grade / multiple", () => {
  it("da 1 con el conjunto exacto", () => {
    expect(grade(multiple, { choiceIds: ["a", "b", "c"] })).toEqual({
      isCorrect: true,
      ratio: 1,
    });
  });

  it("el orden de selección no importa", () => {
    expect(grade(multiple, { choiceIds: ["c", "a", "b"] }).ratio).toBe(1);
  });

  it("da crédito parcial con 2 de 3 correctas", () => {
    expect(grade(multiple, { choiceIds: ["a", "b"] })).toEqual({
      isCorrect: false,
      ratio: 2 / 3,
    });
  });

  it("penaliza los falsos positivos", () => {
    // 3 aciertos - 1 falso positivo = 2, sobre 3 correctas
    expect(grade(multiple, { choiceIds: ["a", "b", "c", "d"] }).ratio).toBe(
      2 / 3,
    );
  });

  it("nunca baja de 0", () => {
    // 1 acierto - 1 falso positivo = 0
    expect(grade(multiple, { choiceIds: ["a", "d"] }).ratio).toBe(0);
    const soloIncorrectas: QuestionCore = {
      type: "multiple",
      payload: { choices: opts("a", "b") },
      answer: { choiceIds: ["a"] },
    };
    expect(grade(soloIncorrectas, { choiceIds: ["b"] }).ratio).toBe(0);
  });

  it("no se infla con ids repetidos", () => {
    expect(grade(multiple, { choiceIds: ["a", "a", "a"] }).ratio).toBe(1 / 3);
  });

  it("no responder nada da 0", () => {
    expect(grade(multiple, { choiceIds: [] }).ratio).toBe(0);
  });

  it("una pregunta sin opciones correctas da 0 en vez de dividir por cero", () => {
    const rota: QuestionCore = {
      type: "multiple",
      payload: { choices: opts("a", "b") },
      answer: { choiceIds: [] },
    };
    expect(grade(rota, { choiceIds: [] })).toEqual({
      isCorrect: false,
      ratio: 0,
    });
    expect(Number.isNaN(grade(rota, { choiceIds: ["a"] }).ratio)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// truefalse
// ---------------------------------------------------------------------------

describe("grade / truefalse", () => {
  it("compara el booleano", () => {
    expect(grade(truefalse, { value: true }).isCorrect).toBe(true);
    expect(grade(truefalse, { value: false }).ratio).toBe(0);
  });

  it("no acepta valores que no sean booleanos", () => {
    expect(grade(truefalse, { value: "true" }).isCorrect).toBe(false);
    expect(grade(truefalse, { value: 1 }).isCorrect).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// order
// ---------------------------------------------------------------------------

describe("grade / order", () => {
  it("da 1 con el orden exacto", () => {
    expect(grade(order, { order: ["1", "2", "3", "4"] })).toEqual({
      isCorrect: true,
      ratio: 1,
    });
  });

  it("cuenta los ítems que quedaron en su posición", () => {
    // 1 y 4 en su lugar, 2 y 3 intercambiados
    expect(grade(order, { order: ["1", "3", "2", "4"] }).ratio).toBe(0.5);
  });

  it("un orden totalmente invertido da 0", () => {
    expect(grade(order, { order: ["4", "3", "2", "1"] }).ratio).toBe(0);
  });

  it("una respuesta incompleta da crédito parcial", () => {
    expect(grade(order, { order: ["1", "2"] }).ratio).toBe(0.5);
  });

  it("mandar ítems de más no da 100%", () => {
    const res = grade(order, { order: ["1", "2", "3", "4", "5"] });
    expect(res.isCorrect).toBe(false);
    expect(res.ratio).toBe(4 / 5);
  });

  it("una pregunta sin orden correcto da 0", () => {
    const rota: QuestionCore = {
      type: "order",
      payload: { items: opts("1", "2") },
      answer: { order: [] },
    };
    expect(grade(rota, { order: ["1"] }).ratio).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// match
// ---------------------------------------------------------------------------

describe("grade / match", () => {
  it("da 1 con todos los pares bien", () => {
    expect(grade(match, { pairs: { l1: "r1", l2: "r2" } })).toEqual({
      isCorrect: true,
      ratio: 1,
    });
  });

  it("da crédito parcial con la mitad de los pares", () => {
    expect(grade(match, { pairs: { l1: "r1", l2: "r1" } }).ratio).toBe(0.5);
  });

  it("los pares que faltan cuentan como incorrectos", () => {
    expect(grade(match, { pairs: { l1: "r1" } }).ratio).toBe(0.5);
    expect(grade(match, { pairs: {} }).ratio).toBe(0);
  });

  it("los pares de más no suman", () => {
    expect(
      grade(match, { pairs: { l1: "r1", l2: "r2", l9: "r9" } }).ratio,
    ).toBe(1);
  });

  it("una pregunta sin pares da 0", () => {
    const rota: QuestionCore = {
      type: "match",
      payload: { left: opts("l1"), right: opts("r1") },
      answer: { pairs: {} },
    };
    expect(grade(rota, { pairs: { l1: "r1" } }).ratio).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// slider
// ---------------------------------------------------------------------------

describe("grade / slider", () => {
  it("el valor exacto da 1", () => {
    expect(grade(slider, { value: 100 })).toEqual({ isCorrect: true, ratio: 1 });
  });

  it("dentro de la tolerancia da 1", () => {
    expect(grade(slider, { value: 91 }).ratio).toBe(1);
    expect(grade(slider, { value: 110 }).ratio).toBe(1);
  });

  it("justo en el borde de la tolerancia todavía es correcto", () => {
    expect(grade(slider, { value: 90 }).isCorrect).toBe(true);
  });

  it("decae linealmente hasta el doble de la tolerancia", () => {
    // tolerancia 10 -> a 15 de distancia queda a mitad de camino
    expect(grade(slider, { value: 115 }).ratio).toBeCloseTo(0.5, 10);
    expect(grade(slider, { value: 85 }).ratio).toBeCloseTo(0.5, 10);
    expect(grade(slider, { value: 105 + 10 }).isCorrect).toBe(false);
  });

  it("al doble de la tolerancia o más da 0", () => {
    expect(grade(slider, { value: 120 }).ratio).toBe(0);
    expect(grade(slider, { value: 200 }).ratio).toBe(0);
    expect(grade(slider, { value: 0 }).ratio).toBe(0);
  });

  it("con tolerancia 0 exige el valor exacto", () => {
    const exacto: QuestionCore = {
      type: "slider",
      payload: { min: 0, max: 10, step: 1, unit: "" },
      answer: { value: 7, tolerance: 0 },
    };
    expect(grade(exacto, { value: 7 }).ratio).toBe(1);
    expect(grade(exacto, { value: 8 }).ratio).toBe(0);
  });

  it("rechaza valores que no son números finitos", () => {
    expect(grade(slider, { value: Number.NaN }).ratio).toBe(0);
    expect(grade(slider, { value: Number.POSITIVE_INFINITY }).ratio).toBe(0);
    expect(grade(slider, { value: "100" }).ratio).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// text
// ---------------------------------------------------------------------------

describe("grade / text", () => {
  it("acepta la respuesta exacta", () => {
    expect(grade(text, { text: "cabeza de impresión" })).toEqual({
      isCorrect: true,
      ratio: 1,
    });
  });

  it("ignora mayúsculas, acentos, puntuación y espacios de más", () => {
    expect(grade(text, { text: "  CABEZA   de Impresion!! " }).ratio).toBe(1);
    expect(grade(text, { text: "¡Cabezal!" }).ratio).toBe(1);
  });

  it("acepta cualquiera de las variantes de `accepted`", () => {
    expect(grade(text, { text: "cabezal" }).isCorrect).toBe(true);
  });

  it("tolera typos chicos", () => {
    expect(grade(text, { text: "cabezl" }).isCorrect).toBe(true); // 1 borrado
    expect(grade(text, { text: "cabeza de impresio" }).isCorrect).toBe(true);
  });

  it("no acepta una palabra distinta", () => {
    expect(grade(text, { text: "papel" }).isCorrect).toBe(false);
    expect(grade(text, { text: "cinta entintada" }).isCorrect).toBe(false);
  });

  it("no tolera typos en respuestas muy cortas", () => {
    // Si perdonáramos 2 ediciones acá, "12" y "20" pasarían por "10".
    const corta: QuestionCore = {
      type: "text",
      payload: { placeholder: "" },
      answer: { accepted: ["10"] },
    };
    expect(grade(corta, { text: "10" }).isCorrect).toBe(true);
    expect(grade(corta, { text: "12" }).isCorrect).toBe(false);
    expect(grade(corta, { text: "20" }).isCorrect).toBe(false);
  });

  it("una respuesta vacía o solo puntuación da 0", () => {
    expect(grade(text, { text: "" }).ratio).toBe(0);
    expect(grade(text, { text: "   " }).ratio).toBe(0);
    expect(grade(text, { text: "!!!" }).ratio).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Respuestas mal formadas — nunca deben tirar excepción
// ---------------------------------------------------------------------------

describe("grade / respuestas inválidas", () => {
  const questions: QuestionCore[] = [
    single,
    multiple,
    truefalse,
    order,
    match,
    slider,
    text,
  ];
  const basura: unknown[] = [
    null,
    undefined,
    42,
    "hola",
    [],
    {},
    { choiceId: 123 },
    { order: "1,2,3" },
    { pairs: null },
  ];

  it("devuelve incorrecto en vez de tirar", () => {
    for (const question of questions) {
      for (const response of basura) {
        expect(() => grade(question, response)).not.toThrow();
        expect(grade(question, response)).toEqual({
          isCorrect: false,
          ratio: 0,
        });
      }
    }
  });
});

// ---------------------------------------------------------------------------
// computeScore
// ---------------------------------------------------------------------------

describe("computeScore", () => {
  const base = { points: 1000, ratio: 1, timeLimitMs: 20_000 };

  it("responder instantáneamente da el 100%", () => {
    expect(computeScore({ ...base, elapsedMs: 0 })).toBe(1000);
  });

  it("responder a mitad de tiempo da el 75%", () => {
    expect(computeScore({ ...base, elapsedMs: 10_000 })).toBe(750);
  });

  it("responder justo al final da el 50%", () => {
    expect(computeScore({ ...base, elapsedMs: 20_000 })).toBe(500);
  });

  it("pasarse del tiempo no baja del 50%", () => {
    expect(computeScore({ ...base, elapsedMs: 60_000 })).toBe(500);
  });

  it("ratio 0 da 0 por más rápido que se responda", () => {
    expect(computeScore({ ...base, ratio: 0, elapsedMs: 0 })).toBe(0);
  });

  it("escala con el crédito parcial", () => {
    expect(computeScore({ ...base, ratio: 0.5, elapsedMs: 0 })).toBe(500);
    expect(computeScore({ ...base, ratio: 2 / 3, elapsedMs: 10_000 })).toBe(500);
  });

  it("devuelve un entero", () => {
    const score = computeScore({
      points: 1000,
      ratio: 1 / 3,
      elapsedMs: 7_777,
      timeLimitMs: 25_000,
    });
    expect(Number.isInteger(score)).toBe(true);
  });

  it("clampea un ratio fuera de rango", () => {
    expect(computeScore({ ...base, ratio: 5, elapsedMs: 0 })).toBe(1000);
    expect(computeScore({ ...base, ratio: -3, elapsedMs: 0 })).toBe(0);
  });

  it("aguanta valores basura sin devolver NaN", () => {
    expect(computeScore({ ...base, elapsedMs: -100 })).toBe(1000);
    expect(computeScore({ ...base, elapsedMs: Number.NaN })).toBe(1000);
    expect(computeScore({ ...base, ratio: Number.NaN, elapsedMs: 0 })).toBe(0);
    expect(computeScore({ ...base, timeLimitMs: 0, elapsedMs: 0 })).toBe(500);
    expect(computeScore({ ...base, points: 0, elapsedMs: 0 })).toBe(0);
    expect(computeScore({ ...base, points: -50, elapsedMs: 0 })).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Normalización
// ---------------------------------------------------------------------------

describe("normalizeAnswerText", () => {
  it("baja a minúsculas y saca acentos", () => {
    expect(normalizeAnswerText("Matriz de PUNTO")).toBe("matriz de punto");
    expect(normalizeAnswerText("impresión")).toBe("impresion");
    expect(normalizeAnswerText("MAÑANA")).toBe("manana");
  });

  it("saca puntuación y colapsa espacios", () => {
    expect(normalizeAnswerText("  ¡La   cabeza, de impresión!  ")).toBe(
      "la cabeza de impresion",
    );
    expect(normalizeAnswerText("9-agujas")).toBe("9 agujas");
  });

  it("conserva números", () => {
    expect(normalizeAnswerText("24 agujas")).toBe("24 agujas");
  });

  it("un string solo de puntuación queda vacío", () => {
    expect(normalizeAnswerText("¿?¡!...")).toBe("");
  });
});

describe("normalizeNickname", () => {
  it("normaliza mayúsculas, acentos y espacios pero conserva puntuación", () => {
    expect(normalizeNickname("  Martín   F. ")).toBe("martin f.");
    expect(normalizeNickname("MARTIN F.")).toBe("martin f.");
  });

  it("distingue apodos realmente distintos", () => {
    expect(normalizeNickname("Ana")).not.toBe(normalizeNickname("Ana2"));
  });
});

describe("levenshtein", () => {
  it("da 0 para strings iguales", () => {
    expect(levenshtein("cabezal", "cabezal")).toBe(0);
    expect(levenshtein("", "")).toBe(0);
  });

  it("cuenta inserciones, borrados y sustituciones", () => {
    expect(levenshtein("cabezal", "cabeza")).toBe(1);
    expect(levenshtein("cabezal", "cabezall")).toBe(1);
    expect(levenshtein("cabezal", "cabezol")).toBe(1);
    expect(levenshtein("kitten", "sitting")).toBe(3);
  });

  it("contra un string vacío cuenta el largo del otro", () => {
    expect(levenshtein("papel", "")).toBe(5);
    expect(levenshtein("", "papel")).toBe(5);
  });

  it("es simétrica", () => {
    expect(levenshtein("aguja", "aguijon")).toBe(levenshtein("aguijon", "aguja"));
  });
});
