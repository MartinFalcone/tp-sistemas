import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase";
import type { ApiError } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/admin/answers — qué respondió cada jugador.
 *
 * Con `?questionId=` filtra por pregunta. Sirve para comentar los resultados al
 * cerrar la exposición: quién puso qué y cuántos cayeron en la misma trampa.
 */
export async function GET(request: Request) {
  try {
    const db = getSupabaseAdmin();
    const questionId = new URL(request.url).searchParams.get("questionId");

    let query = db
      .from("answers")
      .select(
        "id, player_id, question_id, response, is_correct, ratio, score, elapsed_ms, created_at",
      )
      .order("created_at", { ascending: true });

    if (questionId) query = query.eq("question_id", questionId);

    const [answers, players, questions] = await Promise.all([
      query,
      db.from("players").select("id, nickname"),
      db
        .from("questions")
        .select("id, order_index, prompt, type")
        .order("order_index", { ascending: true }),
    ]);

    if (answers.error) throw answers.error;
    if (players.error) throw players.error;
    if (questions.error) throw questions.error;

    const nicknames = new Map(
      players.data.map((player) => [player.id, player.nickname]),
    );

    const rows = answers.data.map((answer) => ({
      id: answer.id,
      playerId: answer.player_id,
      // El jugador pudo borrarse; la respuesta no debería desaparecer del análisis.
      nickname: nicknames.get(answer.player_id) ?? "(jugador borrado)",
      questionId: answer.question_id,
      response: answer.response,
      isCorrect: answer.is_correct,
      ratio: answer.ratio,
      score: answer.score,
      elapsedMs: answer.elapsed_ms,
      createdAt: answer.created_at,
    }));

    return NextResponse.json(
      { rows, questions: questions.data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[GET /api/admin/answers]", error);
    return NextResponse.json<ApiError>(
      { error: "No se pudieron cargar las respuestas." },
      { status: 503 },
    );
  }
}
