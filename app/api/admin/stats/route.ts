import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase";
import type { ApiError, GameStateRow, QuestionType } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Se cuenta como conectado quien dio señales de vida en los últimos 2 minutos. */
const ACTIVE_WINDOW_MS = 2 * 60_000;

export type QuestionStat = {
  id: string;
  orderIndex: number;
  type: QuestionType;
  prompt: string;
  isActive: boolean;
  answered: number;
  correct: number;
  /** Proporción de aciertos, 0..1. null si nadie la respondió todavía. */
  rate: number | null;
};

export type AdminStats = {
  state: GameStateRow;
  players: number;
  activePlayers: number;
  answers: number;
  questions: QuestionStat[];
};

/**
 * GET /api/admin/stats — contadores en vivo para el panel.
 *
 * El promedio de aciertos por pregunta es lo que sirve al cerrar la exposición:
 * dice qué hubo que explicar de nuevo.
 */
export async function GET() {
  try {
    const db = getSupabaseAdmin();

    const [state, players, questions, answers] = await Promise.all([
      db.from("game_state").select("*").eq("id", 1).maybeSingle(),
      db.from("players").select("id, last_seen_at"),
      db
        .from("questions")
        .select("id, order_index, type, prompt, is_active")
        .order("order_index", { ascending: true }),
      db.from("answers").select("question_id, is_correct"),
    ]);

    if (state.error) throw state.error;
    if (players.error) throw players.error;
    if (questions.error) throw questions.error;
    if (answers.error) throw answers.error;
    if (!state.data) throw new Error("No existe la fila id=1 en game_state.");

    const cutoff = Date.now() - ACTIVE_WINDOW_MS;
    const activePlayers = players.data.filter(
      (player) =>
        player.last_seen_at && Date.parse(player.last_seen_at) >= cutoff,
    ).length;

    const byQuestion = new Map<string, { answered: number; correct: number }>();
    for (const answer of answers.data) {
      const bucket = byQuestion.get(answer.question_id) ?? {
        answered: 0,
        correct: 0,
      };
      bucket.answered += 1;
      if (answer.is_correct) bucket.correct += 1;
      byQuestion.set(answer.question_id, bucket);
    }

    const stats: AdminStats = {
      state: state.data,
      players: players.data.length,
      activePlayers,
      answers: answers.data.length,
      questions: questions.data.map((question) => {
        const bucket = byQuestion.get(question.id);
        return {
          id: question.id,
          orderIndex: question.order_index,
          type: question.type,
          prompt: question.prompt,
          isActive: question.is_active,
          answered: bucket?.answered ?? 0,
          correct: bucket?.correct ?? 0,
          rate: bucket && bucket.answered > 0
            ? bucket.correct / bucket.answered
            : null,
        };
      }),
    };

    return NextResponse.json(stats, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("[/api/admin/stats]", error);
    return NextResponse.json<ApiError>(
      { error: "No se pudieron leer los contadores." },
      { status: 503 },
    );
  }
}
