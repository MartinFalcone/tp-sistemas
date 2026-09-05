/**
 * Normalización de texto. Sin dependencias y sin nada de servidor:
 * se puede importar desde cualquier lado.
 */

/** Saca los acentos/diacríticos: "café" -> "cafe". */
export function stripAccents(input: string): string {
  return input.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

/**
 * Normaliza la respuesta de texto de un jugador para poder compararla:
 * minúsculas, sin acentos, sin puntuación, espacios colapsados.
 *
 *   "  ¡La CABEZA, de impresión!  " -> "la cabeza de impresion"
 */
export function normalizeAnswerText(input: string): string {
  return stripAccents(input)
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normaliza un apodo para la columna `players.nickname_key`.
 * Igual que arriba pero conservando la puntuación: dos apodos que solo difieren
 * en mayúsculas, acentos o espacios de más se consideran el mismo jugador.
 *
 *   "  Martín   F. " -> "martin f."
 */
export function normalizeNickname(input: string): string {
  return stripAccents(input).toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Distancia de edición de Levenshtein entre dos strings.
 * Implementación con una sola fila: O(a*b) tiempo, O(b) memoria.
 * Las respuestas del quiz son cortas, así que alcanza y sobra.
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1, // inserción
        previous[j] + 1, // borrado
        previous[j - 1] + cost, // sustitución
      );
    }
    previous = current;
  }

  return previous[b.length];
}
