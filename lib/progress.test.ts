import { describe, expect, it } from "vitest";

import { isFromRound, type StoredProgress } from "./progress";

/**
 * El expositor abre y cierra la partida varias veces: primero un ensayo, después
 * la real. El progreso guardado en el celular tiene que morir con su ronda, o el
 * que ya jugó una vez arranca la siguiente directo en "Terminaste".
 */

const RONDA_1 = "2026-09-06T18:00:00.000Z";
const RONDA_2 = "2026-09-06T18:40:00.000Z";

function progreso(overrides: Partial<StoredProgress> = {}): StoredProgress {
  return {
    index: 11,
    questionId: "q12",
    startedAt: 1_757_180_000_000,
    gameStartedAt: RONDA_1,
    ...overrides,
  };
}

describe("isFromRound", () => {
  it("acepta el progreso de la ronda que está corriendo", () => {
    expect(isFromRound(progreso(), RONDA_1)).toBe(true);
  });

  it("rechaza el progreso de la ronda anterior", () => {
    // El caso real: el celular terminó las 12 y quedó con index 11/12. Sin esto
    // la ronda nueva empieza en la pantalla de "Terminaste".
    expect(isFromRound(progreso(), RONDA_2)).toBe(false);
  });

  it("rechaza el progreso de una versión que no guardaba la ronda", () => {
    const viejo = progreso();
    delete viejo.gameStartedAt;
    expect(isFromRound(viejo, RONDA_1)).toBe(false);
  });

  it("rechaza el progreso sellado con null contra una ronda de verdad", () => {
    expect(isFromRound(progreso({ gameStartedAt: null }), RONDA_1)).toBe(false);
  });

  it("no acepta nada cuando no hay progreso guardado", () => {
    expect(isFromRound(null, RONDA_1)).toBe(false);
    expect(isFromRound(null, null)).toBe(false);
  });

  it("sobrevive a una recarga en el medio de la misma ronda", () => {
    // Lo que NO tiene que romperse: recargar la página no puede reiniciar la
    // partida desde la pregunta 1.
    const enCurso = progreso({ index: 4, questionId: "q5" });
    expect(isFromRound(enCurso, RONDA_1)).toBe(true);
  });
});
