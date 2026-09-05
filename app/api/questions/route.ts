import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase";
import {
  questionSchema,
  toPublicQuestion,
  type ApiError,
  type PublicQuestion,
} from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/questions — las preguntas activas, ordenadas, SIN `answer`.
 *
 * Solo responde con la partida en curso: si todavía está en el lobby, nadie
 * tiene que poder bajarse las preguntas antes de tiempo.
 *
 * Cada fila pasa por `toPublicQuestion()`, que borra `answer`. Es la única
 * puerta por la que salen preguntas hacia un jugador.
 */
export async function GET() {
  try {
    const db = getSupabaseAdmin();

    const state = await db
      .from("game_state")
      .select("status")
      .eq("id", 1)
      .maybeSingle();

    if (state.error) throw state.error;
    if (!state.data) {
      throw new Error("No existe la fila id=1 en game_state.");
    }

    if (state.data.status !== "running") {
      return NextResponse.json<ApiError>(
        { error: "La partida todavía no arrancó. Esperá en la sala." },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }

    const rows = await db
      .from("questions")
      .select("*")
      .eq("is_active", true)
      .order("order_index", { ascending: true });

    if (rows.error) throw rows.error;

    // Una pregunta con el jsonb mal cargado se saltea en vez de tumbar la
    // partida entera. Se loguea fuerte para que el expositor la vea y la
    // arregle desde el admin.
    const questions: PublicQuestion[] = [];
    for (const row of rows.data) {
      const parsed = questionSchema.safeParse(row);
      if (!parsed.success) {
        console.error(
          `[/api/questions] pregunta ${row.id} (order_index ${row.order_index}) mal formada, se omite:`,
          parsed.error.issues,
        );
        continue;
      }
      questions.push(toPublicQuestion(parsed.data));
    }

    return NextResponse.json(
      { questions },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("[/api/questions]", error);
    return NextResponse.json<ApiError>(
      {
        error:
          "No se pudieron cargar las preguntas. Se reintenta solo en unos segundos.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
