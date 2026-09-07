import { NextResponse } from "next/server";
import { z } from "zod";

import { getSupabaseAdmin } from "@/lib/supabase";
import type { ApiError } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("open") }),
  z.object({
    action: z.literal("start"),
    /** Duración total de la partida. null = sin deadline global. */
    minutes: z.number().int().min(1).max(180).nullable(),
  }),
  z.object({ action: z.literal("close") }),
  z.object({ action: z.literal("reveal"), value: z.boolean() }),
  z.object({
    action: z.literal("reset"),
    /** Hay que escribir BORRAR. La confirmación también se valida acá. */
    confirm: z.string(),
  }),
]);

/**
 * POST /api/admin/game — control de la partida.
 *
 * Protegido por el middleware: si llega hasta acá, la cookie ya se validó.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ApiError>(
      { error: "No se pudo leer el pedido." },
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<ApiError>(
      { error: "Acción desconocida." },
      { status: 400 },
    );
  }

  try {
    const db = getSupabaseAdmin();
    const action = parsed.data;

    switch (action.action) {
      case "open": {
        const { error } = await db
          .from("game_state")
          .update({ status: "lobby", started_at: null, ends_at: null })
          .eq("id", 1);
        if (error) throw error;
        break;
      }

      case "start": {
        // `started_at` identifica la ronda: cada celular lo guarda junto a su
        // progreso y descarta lo que sea de otra. Por eso "Iniciar" con la
        // partida YA corriendo no lo pisa — si lo hiciera, tocar el botón para
        // corregir la duración mandaría a los 30 alumnos de vuelta a la
        // pregunta 1 en la mitad del juego. Para empezar de nuevo de verdad
        // está "Abrir sala", que lo pone en null.
        const current = await db
          .from("game_state")
          .select("status, started_at")
          .eq("id", 1)
          .maybeSingle();
        if (current.error) throw current.error;

        const enCurso =
          current.data && current.data.status === "running"
            ? current.data.started_at
            : null;

        const startedAt = enCurso ? new Date(enCurso) : new Date();
        // La duración se cuenta desde ahora igual: es lo que el expositor ve al
        // tocar el botón.
        const endsAt =
          action.minutes === null
            ? null
            : new Date(Date.now() + action.minutes * 60_000);

        const { error } = await db
          .from("game_state")
          .update({
            status: "running",
            started_at: startedAt.toISOString(),
            ends_at: endsAt ? endsAt.toISOString() : null,
          })
          .eq("id", 1);
        if (error) throw error;
        break;
      }

      case "close": {
        const { error } = await db
          .from("game_state")
          .update({ status: "finished" })
          .eq("id", 1);
        if (error) throw error;
        break;
      }

      case "reveal": {
        const { error } = await db
          .from("game_state")
          .update({ reveal_ranking: action.value })
          .eq("id", 1);
        if (error) throw error;
        break;
      }

      case "reset": {
        if (action.confirm !== "BORRAR") {
          return NextResponse.json<ApiError>(
            { error: "Para borrar todo tenés que escribir BORRAR." },
            { status: 400 },
          );
        }

        // `answers` cae por cascada al borrar el jugador, pero se borra explícito
        // por si quedó alguna huérfana de una pregunta eliminada.
        const answers = await db
          .from("answers")
          .delete()
          .not("id", "is", null);
        if (answers.error) throw answers.error;

        const players = await db
          .from("players")
          .delete()
          .not("id", "is", null);
        if (players.error) throw players.error;

        // Las preguntas NO se tocan: reiniciar la partida no es perder el TP.
        const state = await db
          .from("game_state")
          .update({ status: "lobby", started_at: null, ends_at: null })
          .eq("id", 1);
        if (state.error) throw state.error;
        break;
      }
    }

    const { data, error } = await db
      .from("game_state")
      .select("*")
      .eq("id", 1)
      .single();
    if (error) throw error;

    return NextResponse.json(
      { state: data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[/api/admin/game]", error);
    return NextResponse.json<ApiError>(
      { error: "No se pudo aplicar el cambio. Probá de nuevo." },
      { status: 503 },
    );
  }
}
