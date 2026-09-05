import { levenshtein, normalizeAnswerText } from "./normalize";
import { RESPONSE_SCHEMAS, type QuestionCore } from "./types";

/**
 * Corrección y puntaje. Funciones puras, sin I/O, sin depender de la hora del sistema.
 *
 * ESTO CORRE SIEMPRE EN EL SERVIDOR. El cliente manda su respuesta y nada más:
 * no manda puntaje, y no conoce la respuesta correcta hasta después de responder.
 */

export type GradeResult = {
  /** Si la respuesta cuenta como acertada (ratio === 1). */
  isCorrect: boolean;
  /** Crédito parcial entre 0 y 1. */
  ratio: number;
};

const WRONG: GradeResult = { isCorrect: false, ratio: 0 };

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function result(ratio: number): GradeResult {
  const clamped = clamp01(ratio);
  return { isCorrect: clamped === 1, ratio: clamped };
}

/**
 * Cuántos typos se le perdonan a una respuesta escrita, según su largo.
 *
 * Un tope fijo de 2 rompe en respuestas cortas: con "10" como correcta, "12" y
 * "20" quedarían a distancia 1 y se darían por buenas. Por eso el margen escala
 * con el largo de la respuesta esperada.
 */
function maxEditDistance(length: number): number {
  if (length <= 3) return 0;
  if (length <= 6) return 1;
  return 2;
}

/**
 * Corrige la respuesta de un jugador contra la respuesta correcta de la pregunta.
 *
 * `response` entra como `unknown` y se valida acá adentro con el schema que
 * corresponde al tipo de la pregunta: una respuesta mal formada es simplemente
 * incorrecta, nunca una excepción.
 */
export function grade(question: QuestionCore, response: unknown): GradeResult {
  switch (question.type) {
    // -- single: acierto o error, sin medias tintas ---------------------------
    case "single": {
      const parsed = RESPONSE_SCHEMAS.single.safeParse(response);
      if (!parsed.success) return WRONG;

      return result(parsed.data.choiceId === question.answer.choiceId ? 1 : 0);
    }

    // -- multiple: (aciertos - falsos positivos) / cantidad de correctas ------
    case "multiple": {
      const parsed = RESPONSE_SCHEMAS.multiple.safeParse(response);
      if (!parsed.success) return WRONG;

      const correct = new Set(question.answer.choiceIds);
      // Set: si el cliente manda ids repetidos no puede inflar el puntaje.
      const selected = new Set(parsed.data.choiceIds);

      // Pregunta mal cargada (ninguna opción correcta): no se puede acertar.
      if (correct.size === 0) return WRONG;

      let hits = 0;
      let falsePositives = 0;
      for (const id of selected) {
        if (correct.has(id)) hits++;
        else falsePositives++;
      }

      return result((hits - falsePositives) / correct.size);
    }

    // -- truefalse -----------------------------------------------------------
    case "truefalse": {
      const parsed = RESPONSE_SCHEMAS.truefalse.safeParse(response);
      if (!parsed.success) return WRONG;

      return result(parsed.data.value === question.answer.value ? 1 : 0);
    }

    // -- order: proporción de ítems en la posición correcta ------------------
    case "order": {
      const parsed = RESPONSE_SCHEMAS.order.safeParse(response);
      if (!parsed.success) return WRONG;

      const expected = question.answer.order;
      const given = parsed.data.order;
      if (expected.length === 0) return WRONG;

      let inPlace = 0;
      for (let i = 0; i < expected.length; i++) {
        if (given[i] === expected[i]) inPlace++;
      }

      // Se divide por el más largo de los dos: mandar ítems de más diluye el
      // ratio en vez de regalar un 100%.
      return result(inPlace / Math.max(expected.length, given.length));
    }

    // -- match: proporción de pares correctos --------------------------------
    case "match": {
      const parsed = RESPONSE_SCHEMAS.match.safeParse(response);
      if (!parsed.success) return WRONG;

      const expected = Object.entries(question.answer.pairs);
      if (expected.length === 0) return WRONG;

      let matched = 0;
      for (const [leftId, rightId] of expected) {
        if (parsed.data.pairs[leftId] === rightId) matched++;
      }

      return result(matched / expected.length);
    }

    // -- slider: 1 dentro de la tolerancia, después baja lineal hasta el doble -
    case "slider": {
      const parsed = RESPONSE_SCHEMAS.slider.safeParse(response);
      if (!parsed.success) return WRONG;
      if (!Number.isFinite(parsed.data.value)) return WRONG;

      const { value: target, tolerance } = question.answer;
      const distance = Math.abs(parsed.data.value - target);

      if (distance <= tolerance) return result(1);
      // tolerance 0 exige el valor exacto: cualquier distancia ya vale 0.
      if (tolerance === 0 || distance >= tolerance * 2) return WRONG;

      // distancia == tolerance -> 1, distancia == 2*tolerance -> 0.
      return result(1 - (distance - tolerance) / tolerance);
    }

    // -- text: normalizar y comparar, tolerando typos ------------------------
    case "text": {
      const parsed = RESPONSE_SCHEMAS.text.safeParse(response);
      if (!parsed.success) return WRONG;

      const given = normalizeAnswerText(parsed.data.text);
      if (given === "") return WRONG;

      const accepted = question.answer.accepted
        .map(normalizeAnswerText)
        .filter((candidate) => candidate !== "");

      // Primero coincidencia exacta (ya normalizada).
      if (accepted.includes(given)) return result(1);

      // Después, tolerancia a typos.
      for (const candidate of accepted) {
        const allowed = maxEditDistance(candidate.length);
        if (allowed === 0) continue;
        // Atajo: si difieren mucho en largo no hace falta calcular la distancia.
        if (Math.abs(candidate.length - given.length) > allowed) continue;
        if (levenshtein(given, candidate) <= allowed) return result(1);
      }

      return WRONG;
    }
  }
}

export type ScoreInput = {
  /** Puntaje máximo de la pregunta (`questions.points`). */
  points: number;
  /** Crédito parcial de grade(), entre 0 y 1. */
  ratio: number;
  /** Cuánto tardó el jugador en responder, en milisegundos. */
  elapsedMs: number;
  /** Tiempo límite de la pregunta en ms (`questions.time_limit * 1000`). */
  timeLimitMs: number;
};

/**
 * Puntaje estilo Kahoot: la mitad es por acertar y la otra mitad por la velocidad.
 *
 *   score = round(points * ratio * (0.5 + 0.5 * max(0, 1 - elapsed/limite)))
 *
 * Responder al toque da el 100% de `points`; responder justo al final, el 50%.
 * Una respuesta incorrecta (ratio 0) da 0, por rápida que haya sido.
 */
export function computeScore({
  points,
  ratio,
  elapsedMs,
  timeLimitMs,
}: ScoreInput): number {
  const accuracy = clamp01(ratio);
  if (accuracy <= 0) return 0;
  if (!Number.isFinite(points) || points <= 0) return 0;

  const elapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  // Sin límite válido no se puede medir velocidad: se paga solo la mitad base.
  const speed =
    Number.isFinite(timeLimitMs) && timeLimitMs > 0
      ? Math.max(0, 1 - elapsed / timeLimitMs)
      : 0;

  return Math.round(points * accuracy * (0.5 + 0.5 * speed));
}
