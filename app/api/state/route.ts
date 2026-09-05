import { NextResponse } from "next/server";

import { entryOf, loadStandings, rankOf } from "@/lib/ranking";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { ApiError, GameStateResponse } from "@/lib/types";

// Lo consultan ~30 celulares cada 2 segundos: nunca puede venir cacheado.
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/state — estado de la partida, para el polling de /jugar.
 *
 * Con `?playerId=` agrega `me` con el puntaje y la posición provisoria de ese
 * jugador. Se calcula solo si se pide: la tabla de posiciones sale de agregar
 * todas las respuestas, y no hace falta pagarla en cada poll de cada celular
 * durante toda la partida. La pide únicamente la pantalla de "Terminaste".
 *
 * Nunca devuelve preguntas ni respuestas correctas.
 */
export async function GET(request: Request) {
  try {
    const db = getSupabaseAdmin();
    const playerId = new URL(request.url).searchParams.get("playerId");

    const [state, players] = await Promise.all([
      db.from("game_state").select("*").eq("id", 1).maybeSingle(),
      db.from("players").select("*", { count: "exact", head: true }),
    ]);

    if (state.error) throw state.error;
    if (players.error) throw players.error;

    if (!state.data) {
      throw new Error(
        "No existe la fila id=1 en game_state. ¿Se ejecutó supabase/schema.sql?",
      );
    }

    const body: GameStateResponse = {
      status: state.data.status,
      endsAt: state.data.ends_at,
      revealRanking: state.data.reveal_ranking,
      playerCount: players.count ?? 0,
    };

    if (playerId) {
      const standings = await loadStandings(db);
      const mine = entryOf(standings.all, playerId);

      body.me = mine
        ? {
            totalScore: mine.score,
            rank: state.data.reveal_ranking
              ? rankOf(standings.ranked, playerId)
              : null,
            totalPlayers: standings.ranked.length,
            answered: mine.answered,
          }
        : null;
    }

    return NextResponse.json(body, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("[/api/state]", error);
    return NextResponse.json<ApiError>(
      {
        error:
          "No se pudo leer el estado de la partida. Se reintenta solo en unos segundos.",
      },
      { status: 503, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}
