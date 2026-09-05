import { NextResponse } from "next/server";

import { describeAnswer } from "@/lib/answerText";
import { entryOf, loadStandings, rankOf } from "@/lib/ranking";
import { computeScore, grade } from "@/lib/scoring";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  answerRequestSchema,
  questionSchema,
  type AnswerResult,
  type ApiError,
} from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";

function fail(message: string, status: number) {
  return NextResponse.json<ApiError>(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * POST /api/answer — recibe una respuesta, la corrige y la puntúa.
 *
 * Todo lo que importa pasa acá y no en el celular: el cliente manda qué eligió y
 * cuánto tardó, nada más. Nunca manda puntaje, y `elapsedMs` se clampea al
 * tiempo límite de la pregunta para que no se pueda inflar la parte de
 * velocidad del puntaje.
 *
 * Es idempotente: si ya hay una respuesta de ese jugador para esa pregunta,
 * devuelve la guardada en vez de fallar. Un reintento por conexión mala no puede
 * ni duplicar ni pisar lo que ya se respondió.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("No se pudo leer el pedido. Recargá la página.", 400);
  }

  const parsed = answerRequestSchema.safeParse(body);
  if (!parsed.success) {
    return fail(
      parsed.error.issues[0]?.message ?? "La respuesta no es válida.",
      400,
    );
  }

  const { playerId, questionId, response, elapsedMs } = parsed.data;

  try {
    const db = getSupabaseAdmin();

    // -- 1. La partida tiene que estar abierta --------------------------------
    const state = await db
      .from("game_state")
      .select("status, ends_at, reveal_ranking")
      .eq("id", 1)
      .maybeSingle();

    if (state.error) throw state.error;
    if (!state.data) throw new Error("No existe la fila id=1 en game_state.");

    if (state.data.status !== "running") {
      return fail("La partida no está en curso.", 409);
    }

    if (state.data.ends_at && Date.parse(state.data.ends_at) <= Date.now()) {
      return fail("Se acabó el tiempo de la partida.", 409);
    }

    // -- 2. La pregunta ------------------------------------------------------
    const row = await db
      .from("questions")
      .select("*")
      .eq("id", questionId)
      .maybeSingle();

    if (row.error) throw row.error;
    if (!row.data || !row.data.is_active) {
      return fail("Esa pregunta ya no está en la partida.", 404);
    }

    const question = questionSchema.safeParse(row.data);
    if (!question.success) {
      console.error(
        `[/api/answer] pregunta ${questionId} mal formada:`,
        question.error.issues,
      );
      return fail(
        "Esa pregunta está mal cargada. Avisale al expositor y seguí con la siguiente.",
        422,
      );
    }

    const revealRanking = state.data.reveal_ranking;

    /** Arma la respuesta HTTP a partir de una fila de `answers` ya guardada. */
    const buildResult = async (saved: {
      is_correct: boolean;
      ratio: number;
      score: number;
    }): Promise<NextResponse> => {
      const standings = await loadStandings(db);
      const mine = entryOf(standings.entries, playerId);

      const result: AnswerResult = {
        isCorrect: saved.is_correct,
        ratio: saved.ratio,
        score: saved.score,
        correctAnswer: describeAnswer(question.data),
        hint: question.data.hint,
        totalScore: mine?.score ?? 0,
        rank: revealRanking ? rankOf(standings.entries, playerId) : null,
        totalPlayers: standings.totalPlayers,
      };

      return NextResponse.json(result, {
        headers: { "Cache-Control": "no-store, max-age=0" },
      });
    };

    // -- 3. ¿Ya había respondido? --------------------------------------------
    const existing = await db
      .from("answers")
      .select("is_correct, ratio, score")
      .eq("player_id", playerId)
      .eq("question_id", questionId)
      .maybeSingle();

    if (existing.error) throw existing.error;
    if (existing.data) return buildResult(existing.data);

    // -- 4. Corregir y puntuar, siempre en el servidor ------------------------
    const timeLimitMs = question.data.time_limit * 1000;
    // El celular podría mandar cualquier cosa: 0 para fingir que respondió al
    // instante, o un número enorme. Se acota al tiempo real de la pregunta.
    const elapsed = Math.min(Math.max(0, Math.floor(elapsedMs)), timeLimitMs);

    const { isCorrect, ratio } = grade(question.data, response);
    const score = computeScore({
      points: question.data.points,
      ratio,
      elapsedMs: elapsed,
      timeLimitMs,
    });

    // -- 5. Guardar -----------------------------------------------------------
    const inserted = await db
      .from("answers")
      .insert({
        player_id: playerId,
        question_id: questionId,
        response: response ?? null,
        is_correct: isCorrect,
        ratio,
        score,
        elapsed_ms: elapsed,
      })
      .select("is_correct, ratio, score")
      .single();

    if (inserted.error) {
      // Dos envíos casi simultáneos (el timeout y un toque, o un reintento que
      // llegó después de que el primero funcionó). Gana el que ya está.
      if (inserted.error.code === UNIQUE_VIOLATION) {
        const saved = await db
          .from("answers")
          .select("is_correct, ratio, score")
          .eq("player_id", playerId)
          .eq("question_id", questionId)
          .maybeSingle();

        if (saved.data) return buildResult(saved.data);
      }

      if (inserted.error.code === FOREIGN_KEY_VIOLATION) {
        return fail(
          "Tu sesión ya no existe. Volvé a entrar con tu apodo.",
          404,
        );
      }

      throw inserted.error;
    }

    // Marca de vida, para que el admin vea quién sigue conectado.
    // Si falla no importa: no cambia el resultado de la respuesta.
    const seen = await db
      .from("players")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", playerId);
    if (seen.error) console.error("[/api/answer] last_seen_at", seen.error);

    return buildResult(inserted.data);
  } catch (error) {
    console.error("[/api/answer]", error);
    return fail(
      "No se pudo guardar tu respuesta. Se reintenta solo en unos segundos.",
      503,
    );
  }
}
