// Sin `server-only` a propósito: este módulo no lee ninguna variable secreta,
// recibe el cliente ya construido por parámetro (y el import del tipo se borra
// en compilación). El guard vive en `lib/supabase.ts`, que es donde está la
// clave. Ponerlo acá solo rompería los tests.
import type { QuizSupabaseClient } from "./supabase";

/**
 * Un jugador con sus totales ya agregados.
 *
 * Es un cálculo, no una fila de la base, así que va en camelCase.
 */
export type StandingEntry = {
  playerId: string;
  nickname: string;
  score: number;
  correct: number;
  answered: number;
  /** Suma de `elapsed_ms` de todas sus respuestas. Desempata el ranking. */
  elapsedMs: number;
};

export type Standings = {
  /** Todos los jugadores, incluidos los que no respondieron nada. */
  all: StandingEntry[];
  /**
   * El ranking: solo quienes respondieron al menos una vez, ordenados por
   * puntaje descendente y, a igual puntaje, por tiempo total ascendente.
   */
  ranked: StandingEntry[];
  /** Cuántas preguntas activas tiene la partida. */
  totalQuestions: number;
};

/**
 * Arma la tabla de posiciones completa.
 *
 * Se traen jugadores y respuestas y se agrega en memoria. Con ~30 jugadores y
 * ~12 preguntas son unas 400 filas: no vale la pena una vista ni un `group by`
 * en Postgres, y así el cálculo queda en un solo lugar y compartido entre
 * `/api/answer`, `/api/state` y `/api/ranking`.
 */
export async function loadStandings(
  db: QuizSupabaseClient,
): Promise<Standings> {
  const [players, answers, questions] = await Promise.all([
    db.from("players").select("id, nickname"),
    db.from("answers").select("player_id, score, is_correct, elapsed_ms"),
    db
      .from("questions")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
  ]);

  if (players.error) throw players.error;
  if (answers.error) throw answers.error;
  if (questions.error) throw questions.error;

  const byPlayer = new Map<string, StandingEntry>();
  for (const player of players.data) {
    byPlayer.set(player.id, {
      playerId: player.id,
      nickname: player.nickname,
      score: 0,
      correct: 0,
      answered: 0,
      elapsedMs: 0,
    });
  }

  for (const answer of answers.data) {
    const entry = byPlayer.get(answer.player_id);
    // Puede no estar si el jugador se borró entre las dos consultas.
    if (!entry) continue;
    entry.score += answer.score;
    entry.answered += 1;
    entry.elapsedMs += answer.elapsed_ms;
    if (answer.is_correct) entry.correct += 1;
  }

  const all = [...byPlayer.values()];

  const ranked = all
    // Quien no respondió nada no está en el ranking: aparecería empatado en 0
    // con quien contestó todo mal, y no es lo mismo.
    .filter((entry) => entry.answered > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        // A igual puntaje gana quien tardó menos en total.
        a.elapsedMs - b.elapsedMs ||
        // Desempate estable, para que dos consultas seguidas den el mismo orden.
        a.nickname.localeCompare(b.nickname, "es"),
    );

  return { all, ranked, totalQuestions: questions.count ?? 0 };
}

/**
 * Posición de un jugador dentro del ranking, empezando en 1.
 *
 * Los empates exactos (mismo puntaje y mismo tiempo) comparten puesto y el
 * siguiente lo saltea: 1, 2, 2, 4. Devuelve null si el jugador todavía no
 * respondió nada, porque no está en el ranking.
 */
export function rankOf(
  ranked: StandingEntry[],
  playerId: string,
): number | null {
  const index = ranked.findIndex((entry) => entry.playerId === playerId);
  if (index === -1) return null;

  const mine = ranked[index];
  const first = ranked.findIndex(
    (entry) => entry.score === mine.score && entry.elapsedMs === mine.elapsedMs,
  );
  return first + 1;
}

/** Posición de cada fila, con la misma regla de empates que `rankOf`. */
export function positionsOf(ranked: StandingEntry[]): number[] {
  return ranked.map((entry) =>
    ranked.findIndex(
      (other) =>
        other.score === entry.score && other.elapsedMs === entry.elapsedMs,
    ) + 1,
  );
}

export function entryOf(
  entries: StandingEntry[],
  playerId: string,
): StandingEntry | null {
  return entries.find((entry) => entry.playerId === playerId) ?? null;
}
