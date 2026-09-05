// Sin `server-only` a propósito: este módulo no lee ninguna variable secreta,
// recibe el cliente ya construido por parámetro (y el import del tipo se borra
// en compilación). El guard vive en `lib/supabase.ts`, que es donde está la
// clave. Ponerlo acá solo rompería los tests.
import type { QuizSupabaseClient } from "./supabase";
import type { RankingEntry } from "./types";

/**
 * Tabla de posiciones completa.
 *
 * Se arma trayendo jugadores y respuestas y agregando en memoria. Con ~30
 * jugadores y ~12 preguntas son unas 400 filas: no vale la pena una vista ni un
 * `group by` en Postgres, y así el cálculo queda en un solo lugar, testeable y
 * compartido entre `/api/answer`, `/api/state` y el ranking final.
 */
export type Standings = {
  entries: RankingEntry[];
  totalPlayers: number;
};

export async function loadStandings(
  db: QuizSupabaseClient,
): Promise<Standings> {
  const [players, answers] = await Promise.all([
    db.from("players").select("id, nickname"),
    db.from("answers").select("player_id, score, is_correct"),
  ]);

  if (players.error) throw players.error;
  if (answers.error) throw answers.error;

  const byPlayer = new Map<string, RankingEntry>();
  for (const player of players.data) {
    byPlayer.set(player.id, {
      player_id: player.id,
      nickname: player.nickname,
      score: 0,
      correct: 0,
      answered: 0,
    });
  }

  for (const answer of answers.data) {
    const entry = byPlayer.get(answer.player_id);
    // Puede no estar si el jugador se borró entre las dos consultas.
    if (!entry) continue;
    entry.score += answer.score;
    entry.answered += 1;
    if (answer.is_correct) entry.correct += 1;
  }

  const entries = [...byPlayer.values()].sort(
    (a, b) =>
      b.score - a.score ||
      b.correct - a.correct ||
      // Desempate estable, para que dos consultas seguidas den el mismo orden.
      a.nickname.localeCompare(b.nickname, "es"),
  );

  return { entries, totalPlayers: entries.length };
}

/**
 * Posición de un jugador, con empates compartiendo puesto (1, 2, 2, 4).
 * Devuelve null si el jugador no está en la tabla.
 */
export function rankOf(entries: RankingEntry[], playerId: string): number | null {
  const index = entries.findIndex((entry) => entry.player_id === playerId);
  if (index === -1) return null;

  const score = entries[index].score;
  const firstWithSameScore = entries.findIndex((entry) => entry.score === score);
  return firstWithSameScore + 1;
}

export function entryOf(
  entries: RankingEntry[],
  playerId: string,
): RankingEntry | null {
  return entries.find((entry) => entry.player_id === playerId) ?? null;
}
