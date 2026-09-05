import { NextResponse } from "next/server";

import { loadStandings, positionsOf } from "@/lib/ranking";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { ApiError, RankingResponse, RankingRow } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/ranking — la tabla de posiciones.
 *
 * Orden: puntaje descendente y, a igual puntaje, tiempo total ascendente.
 * Quien no respondió nada queda afuera.
 *
 * Con `?tv=1` la devuelve aunque `reveal_ranking` esté apagado, para el
 * proyector. OJO: eso NO es un control de acceso — un alumno puede agregar el
 * parámetro igual. `reveal_ranking` es una decisión de presentación del
 * expositor, no un secreto: lo que sí está protegido de verdad son las
 * respuestas correctas, que no salen nunca de `/api/questions`.
 *
 * Con la partida terminada se muestra siempre: `reveal_ranking` significa "¿se
 * ve el ranking MIENTRAS se juega?".
 */
export async function GET(request: Request) {
  try {
    const db = getSupabaseAdmin();
    const tv = new URL(request.url).searchParams.get("tv") === "1";

    const state = await db
      .from("game_state")
      .select("status, reveal_ranking")
      .eq("id", 1)
      .maybeSingle();

    if (state.error) throw state.error;
    if (!state.data) throw new Error("No existe la fila id=1 en game_state.");

    const { status, reveal_ranking: revealRanking } = state.data;
    const hidden = !revealRanking && status !== "finished" && !tv;

    if (hidden) {
      // Sin filas: si el expositor la tiene oculta, la tabla no viaja ni
      // siquiera para que el cliente la descarte.
      const body: RankingResponse = {
        rows: [],
        totalQuestions: 0,
        status,
        revealRanking,
        hidden: true,
      };
      return NextResponse.json(body, {
        headers: { "Cache-Control": "no-store, max-age=0" },
      });
    }

    const standings = await loadStandings(db);
    const positions = positionsOf(standings.ranked);

    const rows: RankingRow[] = standings.ranked.map((entry, index) => ({
      position: positions[index],
      playerId: entry.playerId,
      nickname: entry.nickname,
      score: entry.score,
      correct: entry.correct,
      answered: entry.answered,
    }));

    const body: RankingResponse = {
      rows,
      totalQuestions: standings.totalQuestions,
      status,
      revealRanking,
      hidden: false,
    };

    return NextResponse.json(body, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("[/api/ranking]", error);
    return NextResponse.json<ApiError>(
      {
        error:
          "No se pudo cargar el ranking. Se reintenta solo en unos segundos.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
