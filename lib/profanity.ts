import { normalizeAnswerText, stripAccents } from "./normalize";

/**
 * Filtro de apodos. Lista corta y a propósito conservadora: la idea es frenar lo
 * obvio en un aula, no moderar internet.
 *
 * Dos niveles, para no caer en el problema de Scunthorpe (bloquear palabras
 * inocentes que contienen una prohibida):
 *
 *  - BLOCKED_WORDS: coincidencia exacta, contra cada palabra del apodo y contra
 *    el apodo entero sin separadores (así "p.u.t.o" cae). Acá van los términos
 *    que aparecen dentro de palabras normales: "puto" está en "diputado" y en
 *    "cómputo", "culo" en "cálculo" y "artículo", "pija" en "pijama".
 *  - BLOCKED_FRAGMENTS: coincidencia por substring sobre el apodo sin
 *    separadores. Solo términos que no aparecen dentro de ninguna palabra
 *    inocente, para atrapar cosas como "hijo.de.puta" o "ElPelotudo99".
 *
 * Consecuencia asumida: un apodo que mete una palabra de la primera lista dentro
 * de otra cosa ("elputomas1") pasa. Se prefiere eso a bloquear "diputado". Para
 * 30 personas en un aula, con el expositor mirando el panel, alcanza.
 */

const BLOCKED_WORDS = new Set([
  "puta",
  "putas",
  "puto",
  "putos",
  "putita",
  "putito",
  "concha",
  "conchas",
  "verga",
  "pija",
  "pijas",
  "pito",
  "choto",
  "chota",
  "culo",
  "ojete",
  "orto",
  "teta",
  "tetas",
  "mierda",
  "cagon",
  "cagona",
  "forro",
  "forra",
  "sorete",
  "pelotudo",
  "pelotuda",
  "boluda",
  "tarado",
  "tarada",
  "idiota",
  "imbecil",
  "estupido",
  "estupida",
  "maricon",
  "marica",
  "trolo",
  "trola",
  "nazi",
  "hitler",
  "hdp",
  "ctm",
  "lpm",
  "qlo",
]);

const BLOCKED_FRAGMENTS = [
  "hijodeputa",
  "hijadeputa",
  "putamadre",
  "putomadre",
  "conchatumadre",
  "conchadetumadre",
  "conchudo",
  "conchuda",
  "pelotud",
  "poronga",
  "culiad",
  "culiao",
  "garcha",
  "chupapij",
  "chupalapija",
  "comepija",
  "lameculo",
  "mierda",
  "sorete",
  "maricon",
];

/** "holaaaa" -> "hola". Evita esquivar el filtro estirando letras. */
function collapseRepeats(value: string): string {
  return value.replace(/(.)\1{2,}/gu, "$1");
}

/** Deja solo letras y números, sin espacios ni acentos: "p.u.t.o" -> "puto". */
function compact(value: string): string {
  return collapseRepeats(
    stripAccents(value)
      .toLowerCase()
      .replace(/[^\p{Letter}\p{Number}]/gu, ""),
  );
}

/** True si el apodo tiene alguno de los términos bloqueados. */
export function containsProfanity(nickname: string): boolean {
  const words = normalizeAnswerText(nickname)
    .split(" ")
    .filter((word) => word !== "")
    .map(collapseRepeats);

  if (words.some((word) => BLOCKED_WORDS.has(word))) return true;

  const compacted = compact(nickname);
  // El apodo entero sin separadores: atrapa "p.u.t.o" y "P U T O".
  if (BLOCKED_WORDS.has(compacted)) return true;

  return BLOCKED_FRAGMENTS.some((fragment) => compacted.includes(fragment));
}
